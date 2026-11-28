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
    // 파일을 열 수 없어 판정 자체를 못 했으면 true — real=false(오탐)와 구분해 지적을 '미검증'으로 보존한다
    unreadable: { type: 'boolean' },
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
  { schema: COLLECT_SCHEMA, model: 'haiku', effort: 'low', label: '파일 수집' },
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
        // 감사 에이전트가 상대 경로·파일명만 적어도 검증자가 같은 파일을 열도록, 수집 단계의 경로를 함께 준다
        const path = audited.file.path || f.file
        const v = await agent(
          `${scope}\n감사 대상 파일(수집 단계 경로): ${path}\n` +
            '다음 DB 감사 지적을 반박하라. 위 경로의 파일을 직접 열어 확인하라. 재현되지 않거나 근거가 약하면 real=false. 확신이 없으면 real=false로 기운다. ' +
            '단, 파일을 찾거나 열 수 없어 판정 자체를 못 했으면 real 대신 unreadable=true 로 답하라(오탐 판정과 구분).\n' +
            `파일: ${f.file}${f.line ? ':' + f.line : ''}\n분류: ${f.category || ''}\n심각도: ${f.severity}\n지적: ${f.summary}\n상세: ${f.detail || ''}`,
          { schema: VERDICT_SCHEMA, model: 'sonnet', effort: 'low', phase: '검증', label: `검증:${path}` },
        )
        // 검증 에이전트 실패(null)·파일 읽기 실패는 폐기하지 않고 '미검증'으로 보존한다(조용한 누락 방지)
        if (!v) return Object.assign({}, f, { file: path, verifyNote: '⚠ 검증 에이전트 실패 — 미검증' })
        if (v.unreadable) return Object.assign({}, f, { file: path, verifyNote: '⚠ 검증자가 파일을 열지 못함 — 미검증' })
        return v.real ? Object.assign({}, f, { file: path }) : null
      }),
    )
    return verified.filter(Boolean)
  },
)


// 여러 감사 차원이 같은 근본 결함을 각자 보고한다(예: LIMIT a,b 를 정확성·방언·PG 함정이 모두 지적 — 실제 실행에서 한 결함이 최대 13회).
// 에이전트가 같은 결함끼리 번호로 묶게 하고, 묶음이 모든 번호를 정확히 한 번씩 포함하지 않거나 실패하면 병합하지 않는다(fail-safe: 지적을 잃지 않음).
const _SEV = Object.assign(Object.create(null), { critical: 0, high: 1, medium: 2, low: 3 })
const _rk = (s) => (typeof _SEV[s] === 'number' ? _SEV[s] : 9)
const GROUP_SCHEMA = { type: 'object', required: ['groups'], properties: { groups: { type: 'array', items: { type: 'array', items: { type: 'integer' } } } } }
async function consolidate(list) {
  if (list.length < 2) return list
  let g = null
  try {
    g = await agent(
      '다음 감사 지적 목록에서 "같은 파일의 같은 근본 결함"을 가리키는 항목끼리 번호로 묶어라. ' +
        '줄 번호가 조금 다르거나 표현·언어·분류(category)가 달라도 같은 결함이면 한 묶음이다. 다른 결함은 절대 묶지 마라(같은 줄이라도 원인이 다르면 따로). ' +
        '모든 번호가 정확히 한 묶음에 한 번씩 들어가야 한다(혼자인 항목은 [n] 하나짜리 묶음).\n' +
        JSON.stringify(list.map((f, i) => ({ n: i, file: f.file, line: f.line, category: f.category, severity: f.severity, summary: f.summary }))),
      { schema: GROUP_SCHEMA, model: 'sonnet', effort: 'low', phase: '검증', label: '의미 중복 병합' },
    )
  } catch (e) { log('의미 중복 병합 생략(예외) — 원 목록 그대로 사용'); return list }
  const groups = (g && Array.isArray(g.groups)) ? g.groups : null
  const flat = groups ? groups.flat() : []
  const valid = groups && flat.length === list.length && flat.every((n) => Number.isInteger(n) && n >= 0 && n < list.length) &&
    new Set(flat).size === list.length && groups.every((x) => Array.isArray(x) && x.length > 0)
  if (!valid) { log('의미 중복 병합 결과가 유효하지 않음 — 원 목록 그대로 사용(지적 손실 방지)'); return list }
  const warn = (f) => (f.verifyNote ? 1 : 0)
  return groups.map((ix) => {
    const members = ix.map((n) => list[n]).sort((a, b) => (_rk(a.severity) - _rk(b.severity)) || (warn(a) - warn(b)))
    const rep = members[0]
    if (members.length === 1) return rep
    return Object.assign({}, rep, {
      mergedCount: members.length,
      mergedCategories: Array.from(new Set(members.map((m) => m.category).filter(Boolean))),
      alsoReportedAs: members.slice(1, 4).map((m) => m.summary),
    })
  }).sort((a, b) => _rk(a.severity) - _rk(b.severity))
}
const confirmed = await consolidate(perFile.flat().filter(Boolean))
log(`확인된 지적 ${confirmed.length}건(의미 중복 병합 후), 미검증 보존 ${confirmed.filter((f) => f.verifyNote).length}건`)

// 4) 리포트 ---------------------------------------------------------------
phase('리포트')
const report = await agent(
  '다음은 검증을 통과한 DB 감사 지적 목록(JSON)이다. 심각도(high→medium→low)·차원(category)·파일별로 묶어 한국어 마크다운 리포트를 작성하라. ' +
    '각 항목은 `파일:라인` · 분류 · 심각도 · 요약 · 권고를 포함하고, 지적이 없으면 통과(PASS)임을 명시하라. ' +
    'mergedCount 가 있는 항목은 여러 차원이 같은 결함을 보고한 것이니 한 항목으로 쓰고 mergedCategories 를 함께 표기하라. ' +
    'verifyNote 가 있는 항목은 반박 검증을 못 거친 것이니 별도 "미검증" 절로 모아 그 사실을 표시하고, 미검증 high 가 있으면 PASS 라고 쓰지 마라.\n\n' +
    JSON.stringify(confirmed),
  { model: 'sonnet', label: '리포트 작성' },
)
// 리포트 에이전트가 드물게 도구 호출을 본문으로 흘린다(`SubagentHandback({message: `…`})` + 꼬리말 — 실제 실행에서 관측). 본문만 남긴다.
function cleanReport(s) {
  if (typeof s !== 'string') return s
  const m = s.match(/^\s*SubagentHandback\(\{\s*message:\s*`([\s\S]*)`\s*\}\)/)
  return m ? m[1].replace(/\\`/g, '`').trim() : s
}
return cleanReport(report)
