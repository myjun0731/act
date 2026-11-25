export const meta = {
  name: 'design',
  description: 'SDLC 설계 단계: 서로 다른 각도의 접근안 → 설계서 작성 → 심사 패널 채점 → 사용자 지정 품질에 도달할 때까지 보강 반복 → 구현용 작업 목록(02-tasks.json) 추출',
  whenToUse: '/sdlc:pipeline 의 2단계(사용자 관문). 분석서(01-analysis.md) 확정 후 실행. args: { dir, analysis, quality:{...}, feedback, previous }.',
  phases: [
    { title: '접근안', detail: 'MVP·확장성·위험 최소 3각도 접근안' },
    { title: '작성', detail: '설계서 초안/보강본 작성' },
    { title: '평가', detail: '심사 패널이 기준별 0~100 채점' },
    { title: '확정', detail: '확정본 + 작업 목록 추출' },
  ],
}

// ---------------------------------------------------------------------------
// 입력
// ---------------------------------------------------------------------------
const A = (args && typeof args === 'object') ? args : {}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const analysis = String(A.analysis || `${dir}/01-analysis.md`)
const FINAL = `${dir}/02-design.md`
const TASKS = `${dir}/02-tasks.json`
const feedback = A.feedback ? String(A.feedback) : ''

const DEFAULT_CRITERIA = [
  { key: 'traceability', weight: 3, desc: '추적성 — 분석서의 모든 REQ/AC 가 설계 요소·작업(TASK)·테스트(TC)로 빠짐없이 연결됨' },
  { key: 'soundness', weight: 2, desc: '구조 타당성 — 컴포넌트·데이터 모델·인터페이스가 기존 코드 관례와 맞고, 대안 대비 선택 근거가 있음' },
  { key: 'implementability', weight: 2, desc: '구현 가능성 — 작업이 파일 단위로 구체적이고 의존·순서가 명확하며, 각 작업을 독립적으로 수행·확인 가능' },
  { key: 'testability', weight: 2, desc: '테스트 가능성 — AC 마다 테스트 케이스·종류·위치·실행 명령이 정의됨' },
  { key: 'risk', weight: 1, desc: '위험 관리 — 위험·완화·롤백, 호환성·마이그레이션 고려가 있음' },
]
const Q = resolveQuality(A.quality, DEFAULT_CRITERIA)
log(`목표: 가중 평균 ≥ ${Q.target}, 기준별 하한 ≥ ${Q.floor}, 필수 항목 ${Q.mustHave.length}개, 심사 ${Q.judges}명, 최대 ${Q.maxRounds}라운드`)

// ---------------------------------------------------------------------------
// 1) 접근안 (previous 가 있으면 생략)
// ---------------------------------------------------------------------------
const APPROACH_SCHEMA = {
  type: 'object',
  required: ['name', 'summary'],
  properties: {
    name: { type: 'string' }, summary: { type: 'string' }, design: { type: 'string' },
    tradeoffs: { type: 'string' }, risks: { type: 'string' },
  },
}
let approaches = []
if (!A.previous) {
  phase('접근안')
  const ANGLES = [
    { key: 'mvp', ask: '단순성 우선 — 요구를 만족하는 가장 작은 변경' },
    { key: 'scale', ask: '확장성·유지보수 우선 — 변경과 성장에 강한 구조' },
    { key: 'risk', ask: '위험 최소 우선 — 기존 동작 보존, 되돌리기 쉬움, 실패 격리' },
  ]
  approaches = (await parallel(ANGLES.map((g) => () =>
    agent(
      `분석서: ${analysis} (읽어라. 필요하면 관련 코드도 읽어라. 아무것도 수정하지 마라.)\n` +
        `${feedback ? `사용자 피드백(반드시 반영):\n${feedback}\n` : ''}` +
        `"${g.ask}" 관점으로 설계 접근안을 하나 제시하라. name·summary·design(핵심 구조·인터페이스·변경 파일)·tradeoffs·risks.`,
      { schema: APPROACH_SCHEMA, phase: '접근안', label: `접근:${g.key}` },
    ).then((r) => (r ? Object.assign({ angle: g.key }, r) : null)),
  ))).filter(Boolean)
  log(`접근안 ${approaches.length}개`)
}

// ---------------------------------------------------------------------------
// 2~3) 작성 ↔ 평가 루프
// ---------------------------------------------------------------------------
const TEMPLATE =
  '설계서 형식(한국어 마크다운, 이 순서·제목 유지):\n' +
  '# 설계서\n## 1. 개요·결정 기록 (선택한 접근, 비교한 대안, 결정 근거)\n' +
  '## 2. 구조 (컴포넌트, 데이터 모델, 인터페이스/API 시그니처, 흐름)\n' +
  '## 3. 요구 추적표 (REQ/AC → 설계 요소 → TASK → TC, 표)\n' +
  '## 4. 변경 파일 계획 (신규/수정 파일과 이유)\n' +
  '## 5. 작업 분해 — TASK-01 형식: 제목, 대상 파일, 선행 작업, 대응 AC, 완료 조건. 서로 다른 작업은 가능하면 파일이 겹치지 않게.\n' +
  '## 6. 테스트 전략 — TC-01 형식: 대응 AC, 종류(단위/통합/E2E), 테스트 파일 위치, 실행 명령\n' +
  '## 7. 위험·완화·롤백'

const roundPath = (r) => `${dir}/02-design.r${r}.md`

async function draft(round, prev, gaps) {
  const path = roundPath(round)
  const base = prev
    ? `이전 본: ${prev}\n이 문서를 읽고, 아래 평가 지적을 해소하도록 필요한 추가 조사 후 개선본을 작성하라. ` +
      '분량으로 점수를 얻으려 하지 말고, 지적이 사실과 다르면 근거를 들어 본문에서 반박해도 된다.\n\n' +
      `평가 지적(약한 기준 순):\n${gaps}\n`
    : `접근안들(JSON):\n${JSON.stringify(approaches)}\n가장 적합한 접근을 중심으로 하되 다른 접근의 좋은 아이디어를 접목해 설계서를 작성하라.\n`
  const out = await agent(
    `분석서: ${analysis} (먼저 읽어라)\n${feedback ? `사용자 피드백(반드시 반영):\n${feedback}\n` : ''}\n${base}\n${TEMPLATE}\n\n` +
      `평가 기준(가중치):\n${Q.criteria.map((c) => `- ${c.key}(${c.weight}): ${c.desc}`).join('\n')}\n` +
      (Q.mustHave.length ? `필수 포함 항목:\n${Q.mustHave.map((m) => `- ${m}`).join('\n')}\n` : '') +
      `\n완성본을 ${path} 에 쓰고, 쓴 경로 한 줄만 반환하라. 코드 파일은 수정하지 마라.`,
    { phase: '작성', label: `작성 r${round}` },
  )
  return out ? path : null
}

const ctx = `분석서: ${analysis}\n${feedback ? `사용자 피드백:\n${feedback}\n` : ''}`
const result = await qualityLoop({
  draft: draft,
  initial: (A.previous && !feedback) ? String(A.previous) : null,
  seed: (A.previous && feedback) ? String(A.previous) : null,
  docKind: '설계서',
  context: ctx,
})

// ---------------------------------------------------------------------------
// 4) 확정 + 작업 목록 추출
// ---------------------------------------------------------------------------
phase('확정')
let tasks = null
if (result.bestPath) {
  const TASKS_SCHEMA = {
    type: 'object',
    required: ['tasks'],
    properties: {
      buildCmd: { type: 'string' },
      testCmd: { type: 'string' },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title', 'files'],
          properties: {
            id: { type: 'string' }, title: { type: 'string' },
            files: { type: 'array', items: { type: 'string' } },
            dependsOn: { type: 'array', items: { type: 'string' } },
            acceptance: { type: 'array', items: { type: 'string' } },
            details: { type: 'string' },
          },
        },
      },
    },
  }
  tasks = await agent(
    `${result.bestPath} 의 내용을 그대로 ${FINAL} 로 복사하라(덮어쓰기). 그다음 ${FINAL} 의 "작업 분해"와 분석서 ${analysis} 의 "빌드·테스트 실행 방법"을 읽고 ` +
      `작업 목록을 구조화해 반환하라(id 는 TASK-xx 그대로, files 는 레포 루트 기준 경로, acceptance 는 대응 AC 의 판정 문장, details 는 구현 지침 요약). ` +
      `같은 JSON 을 ${TASKS} 에도 저장하라.`,
    { schema: TASKS_SCHEMA, phase: '확정', label: '작업 목록 추출' },
  )
  log(`작업 ${tasks && tasks.tasks ? tasks.tasks.length : 0}개 추출`)
}
return Object.assign({
  phase: 'design',
  path: result.bestPath ? FINAL : null,
  tasksPath: tasks ? TASKS : null,
  taskCount: tasks && tasks.tasks ? tasks.tasks.length : 0,
}, result)

// ===========================================================================
// 공통: 품질 루프 (analyze.js / design.js 동일 구현 — 워크플로는 import 불가)
// ===========================================================================
function resolveQuality(q, defaults) {
  q = q || {}
  const LEVELS = { standard: [75, 60], high: [85, 70], strict: [92, 80] }
  const lv = LEVELS[q.level] || LEVELS.high
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d
  const criteria = (Array.isArray(q.criteria) && q.criteria.length ? q.criteria : defaults)
    .map((c, i) => (typeof c === 'string'
      ? { key: `c${i + 1}`, weight: 1, desc: c }
      : { key: String(c.key || `c${i + 1}`), weight: num(c.weight, 1), desc: String(c.desc || c.key) }))
  return {
    target: num(q.target, lv[0]),
    floor: num(q.floor, lv[1]),
    judges: Math.max(1, Math.min(5, num(q.judges, 3))),
    maxRounds: Math.max(1, Math.min(10, num(q.maxRounds, 5))),
    patience: Math.max(1, num(q.patience, 2)),
    criteria: criteria,
    mustHave: Array.isArray(q.mustHave) ? q.mustHave.map(String) : [],
  }
}

async function qualityLoop(opt) {
  const JUDGE_SCHEMA = {
    type: 'object',
    required: ['scores'],
    properties: {
      scores: {
        type: 'array',
        items: {
          type: 'object',
          required: ['key', 'score'],
          properties: {
            key: { type: 'string' },
            score: { type: 'integer', minimum: 0, maximum: 100 },
            gaps: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      mustHave: {
        type: 'array',
        items: {
          type: 'object',
          required: ['item', 'met'],
          properties: { item: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } },
        },
      },
    },
  }
  const LENSES = [
    { key: 'skeptic', ask: '엄격한 검토자 — 근거 없는 주장, 누락, 모순을 찾는다. 확신이 없으면 낮게 준다.' },
    { key: 'next-step', ask: '다음 단계 담당자 — 이 문서만 보고 다음 단계를 바로 수행할 수 있는지 본다.' },
    { key: 'stakeholder', ask: '요청자 — 원래 요청의 의도와 기대가 빠짐없이 반영됐는지 본다.' },
    { key: 'verifier', ask: '사실 검증자 — 문서가 인용한 file:line·명령을 실제로 열어 맞는지 표본 확인한다.' },
    { key: 'risk', ask: '위험 관점 — 놓친 장애·보안·데이터 위험이 없는지 본다.' },
  ]

  async function evaluate(round, path) {
    const critList = Q.criteria.map((c) => `- ${c.key}: ${c.desc}`).join('\n')
    const mustList = Q.mustHave.length ? `\n필수 항목(각각 충족 여부 판정):\n${Q.mustHave.map((m) => `- ${m}`).join('\n')}` : ''
    const verdicts = (await parallel(LENSES.slice(0, Q.judges).map((l) => () =>
      agent(
        `${opt.context}\n평가 대상 ${opt.docKind}: ${path} (파일을 읽어라. 필요하면 코드도 확인하라. 아무것도 수정하지 마라.)\n\n` +
          `당신의 관점: ${l.ask}\n\n아래 기준마다 0~100 점수와, 점수를 올리려면 보완할 구체적 지적(gaps)을 반환하라. ` +
          `90 이상은 "이대로 다음 단계에 넘겨도 문제없음", 70 은 "쓸 만하지만 보완 필요", 50 이하는 "재작성 수준"이다. ` +
          `관대하게 주지 마라.\n기준:\n${critList}${mustList}`,
        { schema: JUDGE_SCHEMA, phase: '평가', label: `평가 r${round}:${l.key}` },
      ))))
      .filter(Boolean)
    if (!verdicts.length) return null

    const per = {}
    const gaps = {}
    for (const c of Q.criteria) { per[c.key] = []; gaps[c.key] = [] }
    for (const v of verdicts) {
      for (const s of (v.scores || [])) {
        if (per[s.key] && typeof s.score === 'number') {
          per[s.key].push(s.score)
          for (const g of (s.gaps || [])) gaps[s.key].push(g)
        }
      }
    }
    const crit = {}
    let wsum = 0, wtot = 0, min = 100
    for (const c of Q.criteria) {
      const arr = per[c.key]
      const avg = arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0
      crit[c.key] = Math.round(avg * 10) / 10
      wsum += avg * c.weight
      wtot += c.weight
      if (avg < min) min = avg
    }
    const score = wtot ? Math.round((wsum / wtot) * 10) / 10 : 0
    const must = Q.mustHave.map((item) => {
      const votes = verdicts.map((v) => (v.mustHave || []).find((m) => m.item === item)).filter(Boolean)
      const yes = votes.filter((m) => m.met).length
      return { item: item, met: votes.length > 0 && yes * 2 > votes.length, votes: `${yes}/${votes.length}` }
    })
    const passed = score >= Q.target && min >= Q.floor && must.every((m) => m.met)
    // 약한 기준 순으로 지적 정리
    const ordered = Q.criteria.slice().sort((a, b) => crit[a.key] - crit[b.key])
    const gapText = ordered
      .filter((c) => crit[c.key] < 100)
      .map((c) => `[${c.key} ${crit[c.key]}점] ${c.desc}\n` + Array.from(new Set(gaps[c.key])).slice(0, 8).map((g) => `  - ${g}`).join('\n'))
      .join('\n') +
      (must.some((m) => !m.met) ? `\n[필수 항목 미충족]\n${must.filter((m) => !m.met).map((m) => `  - ${m.item}`).join('\n')}` : '')
    return { score: score, min: Math.round(min * 10) / 10, criteria: crit, mustHave: must, passed: passed, gapText: gapText, judges: verdicts.length }
  }

  const history = []
  let best = null
  let path = opt.initial
  let evalr = null
  let stale = 0
  let stopReason = 'maxRounds'

  for (let round = 1; round <= Q.maxRounds; round++) {
    // 작성 (initial 문서가 있으면 1라운드는 그 문서를 먼저 평가)
    if (!(round === 1 && path)) {
      path = await opt.draft(round, best ? best.path : (opt.seed || null),
        evalr ? evalr.gapText : '(평가 전 — 사용자 피드백을 반영하라)')
      if (!path) { stopReason = 'error'; log(`r${round} 작성 실패`); break }
    }
    evalr = await evaluate(round, path)
    if (!evalr) { stopReason = 'error'; log(`r${round} 평가 실패`); break }
    history.push({ round: round, path: path, score: evalr.score, min: evalr.min, passed: evalr.passed, criteria: evalr.criteria })
    log(`r${round}: 점수 ${evalr.score} (최저 기준 ${evalr.min}) → ${evalr.passed ? '통과' : '미달'}`)

    const better = !best || (evalr.passed && !best.passed) ||
      (evalr.passed === best.passed && evalr.score > best.score + 0.5)
    if (better) {
      best = Object.assign({ path: path, round: round }, evalr)
      stale = 0
    } else {
      stale++
      // 개선이 없으면 다음 보강은 최고본에서 출발하되, 이번 라운드 지적도 함께 넘긴다
      evalr = Object.assign({}, evalr, { gapText: best.gapText + '\n\n(직전 시도에서 추가로 나온 지적)\n' + evalr.gapText })
    }
    if (best.passed) { stopReason = 'passed'; break }
    if (stale >= Q.patience) { stopReason = 'stagnated'; log(`${Q.patience}라운드 연속 개선 없음 — 정체로 중단`); break }
  }

  return {
    passed: !!(best && best.passed),
    stopReason: stopReason,
    target: Q.target,
    floor: Q.floor,
    score: best ? best.score : 0,
    minCriterion: best ? best.min : 0,
    criteria: best ? best.criteria : {},
    mustHave: best ? best.mustHave : [],
    gaps: best ? best.gapText : '',
    bestRound: best ? best.round : 0,
    bestPath: best ? best.path : null,
    rounds: history.length,
    history: history,
  }
}
