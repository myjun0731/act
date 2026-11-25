export const meta = {
  name: 'design-approaches',
  description: '설계 문제에 대해 서로 다른 각도로 N개 접근안을 생성하고, 심사 패널이 기준별로 채점한 뒤, 최고안을 중심으로 나머지의 장점을 접목해 설계안(+결정 기록)으로 합성한다',
  whenToUse: '새 기능·리팩터·아키텍처 결정의 설계안을 비교·확정할 때(SDLC 설계 단계). 입력(args)에 설계 브리프(무엇을 설계할지·목표·제약)를 넘긴다. 코드 대상이 아니라 설계 문제 서술이 입력이다.',
  phases: [
    { title: '접근안', detail: '서로 다른 각도로 N개 접근안 생성' },
    { title: '심사', detail: '기준별 심사 패널 채점' },
    { title: '합성', detail: '최고안 + 장점 접목 설계안' },
  ],
}

const APPROACH_SCHEMA = {
  type: 'object',
  required: ['name', 'summary'],
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    design: { type: 'string' },
    tradeoffs: { type: 'string' },
    risks: { type: 'string' },
  },
}

// 접근안 1개를 모든 렌즈로 한 번에 채점(렌즈당 1호출 → 접근안당 1호출로 배칭)
const SCORES_SCHEMA = {
  type: 'object',
  required: ['scores'],
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lens', 'score'],
        properties: {
          lens: { type: 'string' },
          score: { type: 'integer' },
          rationale: { type: 'string' },
        },
      },
    },
  },
}

const brief = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.brief) ? String(args.brief).trim() : ''
if (!brief) return { note: '설계 브리프를 args로 넘겨주세요(무엇을 설계할지·목표·제약).' }

// 생성 각도 (서로 다른 관점의 독립 접근안)
const ANGLES = [
  { key: 'mvp', ask: 'MVP·단순성 우선 — 가장 작고 빠르게 가치를 주는 설계' },
  { key: 'scale', ask: '확장성·유지보수 우선 — 성장과 변경에 강한 설계(hexagonal·contract-first 고려)' },
  { key: 'risk', ask: '위험 최소 우선 — 되돌리기 쉽고 실패가 격리되는 설계' },
]

// 1) 접근안 생성 ----------------------------------------------------------
phase('접근안')
const approaches = (await parallel(
  ANGLES.map((a) => async () => {
    const out = await agent(
      `설계 브리프:\n${brief}\n\n위 문제를 "${a.ask}" 관점에서 설계하라. ` +
        'api-design·hexagonal-architecture·contract-first·architecture-decision-records 스킬 지침이 있으면 적용. ' +
        'name·summary·design(핵심 설계)·tradeoffs·risks 를 반환하라.',
      { agentType: 'dev-toolkit:architect', schema: APPROACH_SCHEMA, phase: '접근안', label: `접근:${a.key}` },
    )
    return out ? Object.assign({ angle: a.key }, out) : null
  }),
)).filter(Boolean)
log(`접근안 ${approaches.length}개 생성`)
if (!approaches.length) return { note: '접근안을 생성하지 못했습니다.' }

// 2) 심사 패널 (접근안마다 여러 렌즈로 채점) ------------------------------
const LENSES = [
  { key: 'fit', ask: '요구 적합성·완전성' },
  { key: 'simplicity', ask: '단순성·구현 난이도' },
  { key: 'scale_maint', ask: '확장성·유지보수성' },
  { key: 'risk', ask: '위험·되돌리기 용이성' },
]

phase('심사')
// 채점은 주어진 4개 렌즈를 1~5점으로 매핑하는 판정 작업이라 sonnet 로 라우팅한다.
// (haiku 는 스모크에서 3회 중 2회 렌즈 환각('smoke_probe' 등)·빈 결과를 내 순위를 왜곡 → 부적합)
// 4개 렌즈를 접근안당 1호출로 배칭(렌즈당 1호출 → 12→3), 환각 렌즈는 집계에서 배제한다.
const lensKeys = {}
LENSES.forEach((l) => { lensKeys[l.key] = true })
const lensList = LENSES.map((l) => `- ${l.key}: ${l.ask}`).join('\n')
const judged = await parallel(
  approaches.map((ap) => async () => {
    const out = await agent(
      `설계 브리프:\n${brief}\n\n접근안 "${ap.name}":\n${ap.design || ap.summary}\n\n` +
        `이 접근안을 아래 ${LENSES.length}개 기준 각각에 대해 1~5점 채점하고 근거를 밝혀라. 기준은 아래가 전부이며, ` +
        `lens 값은 반드시 아래 키를 그대로 쓰고 새 기준을 지어내지 마라:\n${lensList}\n\n` +
        `각 기준마다 { lens(위 키 중 하나), score(1~5 정수), rationale } 를 담아 scores 배열(${LENSES.length}개)로 반환하라.`,
      { schema: SCORES_SCHEMA, model: 'sonnet', effort: 'low', phase: '심사', label: `심사:${ap.angle}` },
    )
    // 알려진 렌즈 키의 유효 점수만 집계(환각 렌즈·결측 배제), 접근안 간 공정 비교 위해 평균으로 정규화(1~5).
    const arr = (out && Array.isArray(out.scores)) ? out.scores : []
    const valid = arr
      .filter((s) => s && lensKeys[s.lens] && typeof s.score === 'number')
      .map((s) => s.score)
    const total = valid.length ? valid.reduce((x, y) => x + y, 0) / valid.length : 0
    return { approach: ap, total: total, scored: valid.length }
  }),
)
judged.sort((a, b) => b.total - a.total)
const ranked = judged.map((j) => ({ name: j.approach.name, angle: j.approach.angle, total: j.total, scored: j.scored }))
log(`심사 완료 — 최고안: ${ranked.length ? ranked[0].name : '-'}`)

// 3) 합성 -----------------------------------------------------------------
phase('합성')
const doc = await agent(
  '다음은 설계 브리프, 생성된 접근안들, 심사 점수(JSON)다. architecture-decision-records 관점으로 한국어 마크다운 "설계안"을 작성하라. ' +
    '구성: ① 추천 설계(최고 점수안 중심)와 근거, ② 다른 접근안에서 접목할 좋은 아이디어, ③ 트레이드오프·위험·완화, ④ 결정 기록(맥락·대안·결정·영향).\n\n' +
    '브리프: ' + brief + '\n접근안: ' + JSON.stringify(approaches) + '\n순위: ' + JSON.stringify(ranked),
  { agentType: 'dev-toolkit:architect', label: '설계안 합성' },
)
return doc
