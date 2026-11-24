export const meta = {
  name: 'impact-analysis',
  description: '변경 범위를 네 각도(호출·데이터·화면·모듈)로 멀티모달 스위프해 영향받는 영역을 찾아 검증하고, 회귀 테스트 계획으로 합친다',
  whenToUse: '변경이 어디에 파급되는지와 무슨 회귀를 돌릴지 산정할 때. 입력(args)으로 PR·브랜치·경로·심볼을 넘기면 그 범위, 없으면 작업 트리의 변경.',
  phases: [
    { title: '수집', detail: '변경 심볼·파일·테이블 식별' },
    { title: '영향', detail: '호출·데이터·화면·모듈 각도로 병렬 스위프' },
    { title: '검증', detail: '영향 항목을 반박 검증' },
    { title: '계획', detail: '회귀 테스트 계획으로 합성' },
  ],
}

const CHANGES_SCHEMA = {
  type: 'object',
  required: ['changes'],
  properties: {
    changes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
          kind: { type: 'string' },
          symbols: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const IMPACT_SCHEMA = {
  type: 'object',
  required: ['impacted'],
  properties: {
    impacted: {
      type: 'array',
      items: {
        type: 'object',
        required: ['area', 'reason'],
        properties: {
          area: { type: 'string' },
          file: { type: 'string' },
          reason: { type: 'string' },
          risk: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}

const target = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.target) ? String(args.target).trim() : ''

// 1) 수집 -----------------------------------------------------------------
phase('수집')
const scope = target
  ? `대상: ${target} — PR·브랜치면 그 범위의 diff, 경로·심볼이면 그 변경을 본다.`
  : '대상: 현재 작업 트리의 변경(git diff HEAD).'
const collected = await agent(
  `${scope}\n변경된 심볼(클래스·메서드·엔드포인트), 파일, 영향받을 수 있는 테이블/컬럼을 식별해 changes로 반환하라.`,
  { schema: CHANGES_SCHEMA, effort: 'low', label: '변경 식별' },
)
const changes = (collected && Array.isArray(collected.changes)) ? collected.changes : []
log(`변경 ${changes.length}건 식별`)
if (!changes.length) return { impacted: [], note: '변경이 없습니다.' }
const changesJson = JSON.stringify(changes)

// 멀티모달 스위프 각도
const ANGLES = [
  { key: 'caller', ask: '변경된 심볼을 호출·참조하는 상위 코드를 역참조로 찾아라. change-impact 스킬 지침이 있으면 적용하라' },
  { key: 'data', ask: '변경된 테이블·컬럼·쿼리를 참조하는 매퍼/SQL/엔티티를 찾아라(5방언 포함). mybatis-patterns 스킬 지침이 있으면 적용하라' },
  { key: 'ui', ask: '변경을 실제로 실행하는 화면·클릭 경로를 찾아라. click-path-audit 스킬 지침이 있으면 적용하라' },
  { key: 'module', ask: '모듈·계층 경계를 넘는 의존·파급을 찾아라. module-regression 스킬 지침이 있으면 적용하라' },
]

// 2) 영향 (멀티모달 스위프, 배리어: 전체 병합 후 중복 제거) ----------------
phase('영향')
const sweeps = await parallel(
  ANGLES.map((a) => async () => {
    const out = await agent(
      `아래 변경 목록에 대해 다음 각도로 영향받는 영역을 찾아라: ${a.ask}.\n` +
        `각 항목에 area·file·reason·risk 를 담아 impacted로 반환하고, 없으면 빈 배열.\n변경: ${changesJson}`,
      { schema: IMPACT_SCHEMA, phase: '영향', label: `스위프:${a.key}` },
    )
    const items = (out && Array.isArray(out.impacted)) ? out.impacted : []
    return items.map((it) => Object.assign({ angle: a.key }, it))
  }),
)
// 중복 제거 (area+file 기준)
const seen = {}
const merged = []
sweeps.filter(Boolean).flat().forEach((it) => {
  const k = (it.area || '') + '|' + (it.file || '')
  if (!seen[k]) { seen[k] = true; merged.push(it) }
})
log(`영향 후보 ${merged.length}건(중복 제거)`)

// 3) 검증 -----------------------------------------------------------------
phase('검증')
const confirmed = (await parallel(
  merged.map((it) => async () => {
    const v = await agent(
      '다음 "영향받음" 주장을 반박하라. 실제로 변경에 의해 영향받지 않거나 근거가 약하면 real=false.\n' +
        `영역: ${it.area}\n파일: ${it.file || ''}\n각도: ${it.angle}\n근거: ${it.reason}`,
      { schema: VERDICT_SCHEMA, phase: '검증', label: `검증:${it.area}` },
    )
    return (v && v.real) ? it : null
  }),
)).filter(Boolean)
log(`확인된 영향 ${confirmed.length}건`)

// 4) 계획 -----------------------------------------------------------------
phase('계획')
const plan = await agent(
  '다음은 변경의 확인된 영향 영역(JSON)이다. module-regression 스킬 지침이 있으면 적용해 한국어 마크다운 "회귀 테스트 계획"을 작성하라. ' +
    '구성: ① 영향 요약(risk 높은 순·각도별), ② 재테스트 대상(모듈·화면·쿼리)과 우선순위, ③ 권장 회귀 범위. 영향이 없으면 그 사실을 명시.\n\n' +
    JSON.stringify(confirmed),
  { label: '회귀 계획' },
)
return plan
