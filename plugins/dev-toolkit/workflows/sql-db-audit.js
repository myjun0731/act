export const meta = {
  name: 'sql-db-audit',
  description: 'SQL·MyBatis 매퍼·마이그레이션/DDL을 수집해 정확성·5방언 일관성·PG 이관함정·최적화·스키마설계 차원으로 감사하고, 각 지적을 검증한 뒤 심각도순 리포트로 합친다',
  whenToUse: 'SQL/매퍼/스키마 변경(또는 특정 경로)을 DB 품질·이관 관점으로 집중 감사할 때. 입력(args)으로 경로·글롭·PR·브랜치를 넘기면 그 범위, 없으면 현재 작업 트리의 SQL/매퍼/DDL.',
  phases: [
    { title: '수집', detail: 'SQL/매퍼/DDL 파일 수집·분류' },
    { title: '감사', detail: '파일별 다차원(정확성·방언·이관함정·최적화/스키마) 병렬 감사' },
    { title: '검증', detail: '각 지적을 독립 반박으로 검증' },
    { title: '리포트', detail: '확인된 지적을 심각도순 단일 리포트로' },
  ],
}

// dev-toolkit에 함께 설치되는 DB 에이전트(sql-pro, database-optimizer, database-architect)를
// 전용 차원의 워커로 디스패치하고, 전용 에이전트가 없는 차원(5방언 일관성·PG 이관함정)은
// 기본 워커에 스킬(mybatis-patterns·postgres-patterns·mysql-patterns)과 핵심 점검을 프롬프트로 지시한다.

const COLLECT_SCHEMA = {
  type: 'object',
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'kind'],
        properties: {
          path: { type: 'string' },
          kind: { type: 'string', enum: ['mapper', 'sql', 'ddl'] },
        },
      },
    },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'summary'],
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' },
          summary: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real'],
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const target = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.target) ? String(args.target).trim() : ''

// 1) 수집 -----------------------------------------------------------------
phase('수집')
const scope = target
  ? `대상: ${target} — 경로/글롭이면 그 안을, PR·브랜치면 그 범위의 변경을 본다.`
  : '대상: 현재 작업 트리의 변경(git diff HEAD) 중 SQL/매퍼/DDL 파일.'
const collected = await agent(
  `${scope}\n` +
    'MyBatis 매퍼 XML, .sql, 마이그레이션/DDL 스크립트를 찾아 나열하고 종류(mapper/sql/ddl)로 분류하라. ' +
    '생성물·백업·벤더 폴더는 제외하라.',
  { schema: COLLECT_SCHEMA, effort: 'low', label: '파일 수집' },
)
const files = (collected && Array.isArray(collected.files)) ? collected.files : []
log(`SQL/매퍼/DDL ${files.length}건 수집`)
if (!files.length) return { findings: [], note: '감사 대상 SQL/매퍼/DDL이 없습니다.' }

// 파일 종류 → 감사 차원
function dimensionsFor(kind) {
  const dims = [
    {
      key: 'correctness',
      agentType: 'dev-toolkit:sql-pro',
      ask: 'SQL 정확성과 인덱스·실행계획(EXPLAIN) 최적화를 점검하라. sql-optimization-patterns 스킬 지침이 있으면 적용하라',
    },
    {
      key: 'dialect',
      ask:
        '5방언(postgresql·tibero·oracle·mysql·mariadb) 매퍼 일관성을 점검하라: 같은 쿼리 ID가 방언별로 존재하고 동작·결과가 일치하는지, ' +
        '누락·불일치·방언 특화 문법 오남용이 없는지. mybatis-patterns 스킬 지침이 있으면 적용하라',
    },
    {
      key: 'pg_trap',
      ask:
        'MariaDB→PostgreSQL 이관 함정을 점검하라: 정수 컬럼 setString 타입오류, varchar(n) 일시 컬럼 캐스트, ' +
        'LIMIT/OFFSET·문자열 함수·date_format 등 함수/문법 차이, 대소문자·식별자 처리. postgres-patterns·mysql-patterns 스킬 지침이 있으면 적용하라',
    },
  ]
  if (kind === 'ddl') {
    dims.push({
      key: 'schema',
      agentType: 'dev-toolkit:database-architect',
      ask: '스키마 설계·제약·인덱스·이관 안전성을 점검하라. postgresql-table-design 스킬 지침이 있으면 적용하라',
    })
  } else {
    dims.push({
      key: 'optimize',
      agentType: 'dev-toolkit:database-optimizer',
      ask: '느린 쿼리·N+1·인덱스 공백·불필요한 풀스캔 관점으로 최적화를 점검하라',
    })
  }
  return dims
}

// 2) 감사 → 3) 검증 (파이프라인) -----------------------------------------
const perFile = await pipeline(
  files,
  // 감사: 파일별 차원들을 동시에
  async (file) => {
    const dims = dimensionsFor(file.kind)
    const results = await parallel(
      dims.map((d) => async () => {
        const opts = { schema: FINDINGS_SCHEMA, phase: '감사', label: `감사:${d.key}:${file.path}` }
        if (d.agentType) opts.agentType = d.agentType
        const out = await agent(
          `파일 ${file.path} 를 다음 관점으로 감사하라: ${d.ask}. ` +
            `발견한 문제만 findings로 반환하고(category에 '${d.key}' 표기), 없으면 빈 배열을 반환하라.`,
          opts,
        )
        return (out && Array.isArray(out.findings)) ? out.findings : []
      }),
    )
    return { file: file, findings: results.filter(Boolean).flat() }
  },
  // 검증
  async (audited) => {
    const fs = audited.findings
    if (!fs.length) return []
    const verified = await parallel(
      fs.map((f) => async () => {
        const v = await agent(
          '다음 DB 감사 지적을 반박하라. 재현되지 않거나 근거가 약하면 real=false. 확신이 없으면 real=false로 기운다.\n' +
            `파일: ${f.file}${f.line ? ':' + f.line : ''}\n분류: ${f.category || ''}\n심각도: ${f.severity}\n지적: ${f.summary}\n상세: ${f.detail || ''}`,
          { schema: VERDICT_SCHEMA, phase: '검증', label: `검증:${f.file}` },
        )
        return (v && v.real) ? f : null
      }),
    )
    return verified.filter(Boolean)
  },
)

const confirmed = perFile.flat().filter(Boolean)
log(`확인된 지적 ${confirmed.length}건`)

// 4) 리포트 ---------------------------------------------------------------
phase('리포트')
const report = await agent(
  '다음은 검증을 통과한 DB 감사 지적 목록(JSON)이다. 심각도(high→medium→low)·차원(category)·파일별로 묶어 한국어 마크다운 리포트를 작성하라. ' +
    '각 항목은 `파일:라인` · 분류 · 심각도 · 요약 · 권고를 포함하고, 지적이 없으면 통과(PASS)임을 명시하라.\n\n' +
    JSON.stringify(confirmed),
  { label: '리포트 작성' },
)
return report
