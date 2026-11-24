export const meta = {
  name: 'review-changes',
  description: '변경 코드를 유형별로 분류해 전문 리뷰어 에이전트로 팬아웃 리뷰하고, 각 지적을 반박 검증한 뒤 심각도순 단일 리포트로 합친다',
  whenToUse: 'PR·브랜치·작업트리의 변경을 Java·SQL/매퍼·프론트·이관/스키마 차원으로 한 번에 리뷰할 때. 입력(args)으로 PR 번호·브랜치·경로를 넘기면 그 범위, 없으면 현재 작업 트리.',
  phases: [
    { title: '분류', detail: '변경 파일을 git으로 나열해 유형별 분류' },
    { title: '리뷰', detail: '유형별 전문 리뷰어 에이전트 팬아웃' },
    { title: '검증', detail: '각 지적을 독립 반박으로 검증(false positive 제거)' },
    { title: '요약', detail: '확인된 지적을 심각도순 단일 리포트로' },
  ],
}

// 이 워크플로는 dev-toolkit에 함께 설치되는 리뷰어 에이전트를 agentType으로 디스패치한다.
// (java-reviewer, sql-pro, react/vue/typescript-reviewer, database-architect)
// SQL/이관처럼 전용 에이전트로 다 담기 어려운 점검은 프롬프트에 스킬을 명시해 보강한다.

const CLASSIFY_SCHEMA = {
  type: 'object',
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'type'],
        properties: {
          path: { type: 'string' },
          type: {
            type: 'string',
            enum: ['java', 'sql_mapper', 'frontend_react', 'frontend_vue', 'frontend_ts', 'migration', 'schema', 'config', 'other'],
          },
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

// 1) 분류 -----------------------------------------------------------------
phase('분류')
const scope = target
  ? `검토 대상: ${target} — PR 번호면 gh/git으로 그 PR의 변경을, 브랜치명이면 그 브랜치와 기본 브랜치의 병합지점(merge-base) diff를, 경로면 그 경로의 변경을 본다.`
  : '검토 대상: 현재 작업 트리의 변경(git diff HEAD, 스테이지 포함).'
const classified = await agent(
  `${scope}\n` +
    '변경된 파일을 git으로 나열하고 각 파일을 유형으로 분류하라. ' +
    '유형: java(.java), sql_mapper(MyBatis 매퍼 XML·.sql), frontend_react(.tsx/.jsx), ' +
    'frontend_vue(.vue), frontend_ts(.ts/.js), migration(마이그레이션·DDL 변경 스크립트), ' +
    'schema(스키마/엔티티 정의), config(설정), other. ' +
    '삭제된 파일·바이너리·생성물·락파일은 other로 두거나 제외하라.',
  { schema: CLASSIFY_SCHEMA, label: '변경 분류' },
)
const files = (classified && Array.isArray(classified.files)) ? classified.files : []
log(`변경 파일 ${files.length}건 분류 완료`)
if (!files.length) return { findings: [], note: '검토할 변경 파일이 없습니다.' }

// 유형 → 리뷰어 라우팅
function reviewerFor(type) {
  switch (type) {
    case 'java':
      return { agentType: 'dev-toolkit:java-reviewer', ask: 'Spring/JPA 계층 구조·트랜잭션·동시성·보안 관점으로 리뷰하라' }
    case 'sql_mapper':
      return {
        agentType: 'dev-toolkit:sql-pro',
        ask:
          'SQL 정확성과 인덱스·실행계획 최적화에 더해, 5방언(postgresql·tibero·oracle·mysql·mariadb) 매퍼 일관성과 ' +
          'MariaDB→PostgreSQL 이관 함정(정수 컬럼 setString 타입오류, varchar(n) 일시 컬럼 캐스트, 함수·문법 차이)을 점검하라. ' +
          'mybatis-patterns·postgres-patterns·sql-optimization-patterns 스킬 지침이 있으면 적용하라',
      }
    case 'frontend_react':
      return { agentType: 'dev-toolkit:react-reviewer', ask: '훅 정확성·렌더 성능·서버/클라이언트 경계·접근성·보안을 리뷰하라' }
    case 'frontend_vue':
      return { agentType: 'dev-toolkit:vue-reviewer', ask: 'Composition API 정확성·반응성 함정·컴포넌트 구조·템플릿 보안을 리뷰하라' }
    case 'frontend_ts':
      return { agentType: 'dev-toolkit:typescript-reviewer', ask: '타입 안전성·async 정확성·Node/웹 보안을 리뷰하라' }
    case 'migration':
    case 'schema':
      return {
        agentType: 'dev-toolkit:database-architect',
        ask:
          '스키마 설계와 이관 안전성을 리뷰하라. postgresql-table-design·database-migration 스킬 지침이 있으면 적용하고, ' +
          '무중단 적용·롤백 가능성·데이터 정합성을 점검하라',
      }
    default:
      return null // config/other 는 리뷰 생략
  }
}

// 2) 리뷰 → 3) 검증 (파이프라인: 단계 간 배리어 없음) --------------------
const perFile = await pipeline(
  files,
  // 리뷰
  async (file) => {
    const r = reviewerFor(file.type)
    if (!r) return { file: file, findings: [] }
    const out = await agent(
      `파일 ${file.path} 를 ${r.ask}. 발견한 문제만 findings로 반환하고(각 항목에 file·line·severity·category·summary·detail), 문제가 없으면 빈 배열을 반환하라.`,
      { agentType: r.agentType, schema: FINDINGS_SCHEMA, phase: '리뷰', label: `리뷰:${file.path}` },
    )
    return { file: file, findings: (out && Array.isArray(out.findings)) ? out.findings : [] }
  },
  // 검증
  async (reviewed) => {
    const fs = reviewed.findings
    if (!fs.length) return []
    const verified = await parallel(
      fs.map((f) => async () => {
        const v = await agent(
          '다음 리뷰 지적을 반박하라. 재현되지 않거나 근거가 약하면 real=false. 확신이 없으면 real=false로 기운다.\n' +
            `파일: ${f.file}${f.line ? ':' + f.line : ''}\n심각도: ${f.severity}\n지적: ${f.summary}\n상세: ${f.detail || ''}`,
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

// 4) 요약 -----------------------------------------------------------------
phase('요약')
const report = await agent(
  '다음은 검증을 통과한 리뷰 지적 목록(JSON)이다. 심각도(high→medium→low)·파일별로 묶어 한국어 마크다운 리뷰 리포트를 작성하라. ' +
    '각 항목은 `파일:라인` · 심각도 · 요약 · 권고를 포함하고, 지적이 없으면 통과(PASS)임을 명시하라.\n\n' +
    JSON.stringify(confirmed),
  { label: '리포트 작성' },
)
return report
