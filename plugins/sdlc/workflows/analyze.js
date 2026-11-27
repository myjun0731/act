export const meta = {
  name: 'analyze',
  description: 'SDLC 분석 단계: 병렬 조사 → 분석서 작성 → 심사 패널 채점 → 사용자 지정 품질(목표 점수·하한·필수 항목)에 도달할 때까지 보강을 반복한다',
  whenToUse: '/sdlc:pipeline 의 1단계(사용자 관문). args: { request, dir, quality:{level|target,floor,judges,maxRounds,patience,criteria,mustHave}, feedback, previous }. 문자열 args 는 request 로 취급.',
  phases: [
    { title: '조사', detail: '코드·요구·위험 병렬 조사' },
    { title: '작성', detail: '분석서 초안/보강본 작성' },
    { title: '평가', detail: '심사 패널이 기준별 0~100 채점' },
    { title: '확정', detail: '최고 라운드 본을 확정본으로' },
  ],
}

// ---------------------------------------------------------------------------
// 입력
// ---------------------------------------------------------------------------
const A = (typeof args === 'string') ? { request: args } : (args && typeof args === 'object' ? args : {})
const request = String(A.request || '').trim()
if (!request && !A.previous) {
  return { phase: 'analysis', passed: false, stopReason: 'no-input', note: 'args.request(무엇을 만들/바꿀지)를 넘겨주세요.' }
}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const FINAL = `${dir}/01-analysis.md`
const feedback = A.feedback ? String(A.feedback) : ''
const scope = A.scope ? String(A.scope) : ''

const DEFAULT_CRITERIA = [
  { key: 'completeness', weight: 3, desc: '요구 완전성 — 요청이 함의하는 기능·비기능 요구가 빠짐없이 REQ-xxx 로 도출됨' },
  { key: 'evidence', weight: 2, desc: '현황 정확성 — 관련 코드·구조·데이터 흐름이 실제 file:line 근거와 함께 맞게 서술됨' },
  { key: 'clarity', weight: 2, desc: '검증 가능성 — 각 REQ 에 판정 가능한 수용기준(AC)이 있고, 모호점은 질문 또는 명시적 가정으로 처리됨' },
  { key: 'scope', weight: 1, desc: '범위·제약 — 포함/제외 범위, 가정, 기술·운영 제약, 빌드·테스트 실행 방법이 명시됨' },
  { key: 'risk', weight: 1, desc: '영향·위험 — 변경 영향(호환성·데이터·보안·성능)과 위험이 식별되고 근거가 있음' },
]

const Q = resolveQuality(A.quality, DEFAULT_CRITERIA)
log(`목표: 가중 평균 ≥ ${Q.target}, 기준별 하한 ≥ ${Q.floor}, 필수 항목 ${Q.mustHave.length}개, 심사 ${Q.judges}명, 최대 ${Q.maxRounds}라운드`)

// ---------------------------------------------------------------------------
// 1) 조사 (첫 라운드 재료) — previous 가 있으면 생략하고 그 문서에서 출발
// ---------------------------------------------------------------------------
const NOTE_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: { type: 'string', description: '마크다운 조사 노트(근거 file:line 포함)' },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

let notes = []
if (!A.previous) {
  phase('조사')
  const PROBES = [
    { key: 'code', ask: '현행 코드 조사 — 요청과 관련된 모듈·진입점·데이터 모델·호출 흐름을 찾아 file:line 근거와 함께 정리하라. 기존 관례(패키지 구조, 네이밍, 에러 처리, 테스트 위치·프레임워크)도 적어라.' },
    { key: 'req', ask: '요구 분해 — 요청을 기능·비기능 요구로 분해하고 각 요구의 수용기준 후보를 제시하라. 요청이 암묵적으로 요구하는 것(검증, 권한, 에러 처리, 마이그레이션 등)과 모호한 점을 찾아라.' },
    { key: 'risk', ask: '제약·영향·위험 조사 — 호환성·데이터·보안·성능 영향과 위험을 찾고, 레포의 빌드·테스트 실행 명령(실제로 확인한 것)을 알아내라.' },
  ]
  notes = (await parallel(PROBES.map((p) => () =>
    agent(
      `요청:\n${request}\n${scope ? `\n조사 범위: ${scope}\n` : ''}${feedback ? `\n사용자 피드백(반드시 반영):\n${feedback}\n` : ''}\n` +
        `${p.ask}\n코드는 읽기만 하고 수정하지 마라. 추측은 추측이라고 표시하라.`,
      { schema: NOTE_SCHEMA, model: 'sonnet', phase: '조사', label: `조사:${p.key}` },
    ).then((r) => (r ? { probe: p.key, ...r } : null)),
  ))).filter(Boolean)
  log(`조사 노트 ${notes.length}건`)
}

// ---------------------------------------------------------------------------
// 2~3) 작성 ↔ 평가 루프
// ---------------------------------------------------------------------------
const TEMPLATE =
  '분석서 형식(한국어 마크다운, 이 순서·제목 유지):\n' +
  '# 분석서\n## 1. 요청 요약·목표\n## 2. 현황 (관련 코드·구조, file:line 근거)\n' +
  '## 3. 요구사항 — REQ-001 형식, 유형(기능/비기능), 설명, 수용기준 AC-001-1 … (판정 가능하게)\n' +
  '## 4. 범위 (포함/제외)·가정·제약\n## 5. 영향·위험 (근거·심각도)\n' +
  '## 6. 빌드·테스트 실행 방법 (확인한 명령)\n## 7. 미해결 질문 (각 질문에 임시 가정 명시)'

const roundPath = (r) => `${dir}/01-analysis.r${r}.md`

async function draft(round, prev, gaps) {
  const path = roundPath(round)
  const base = prev
    ? `이전 본: ${prev}\n이 문서를 읽고, 아래 평가 지적을 해소하도록 필요한 추가 조사(코드 읽기)를 한 뒤 개선본을 작성하라.\n` +
      '분량을 늘려 점수를 얻으려 하지 말고, 근거 없는 주장은 쓰지 마라. 지적이 사실과 다르면 본문에 근거를 들어 반박해도 된다.\n\n' +
      `평가 지적(약한 기준 순):\n${gaps}\n`
    : `조사 노트(JSON):\n${JSON.stringify(notes)}\n이 노트를 바탕으로, 필요하면 코드를 더 읽어 분석서를 작성하라.\n`
  const out = await agent(
    `요청:\n${request}\n${feedback ? `\n사용자 피드백(반드시 반영):\n${feedback}\n` : ''}\n${base}\n${TEMPLATE}\n\n` +
      `평가 기준(가중치):\n${Q.criteria.map((c) => `- ${c.key}(${c.weight}): ${c.desc}`).join('\n')}\n` +
      (Q.mustHave.length ? `필수 포함 항목:\n${Q.mustHave.map((m) => `- ${m}`).join('\n')}\n` : '') +
      `\n코드 구조 파악에 codebase-onboarding 스킬 지침이 있으면 적용하라.` +
      `\n완성본을 ${path} 에 파일로 작성하라(디렉터리가 없으면 만든다). 코드 파일은 수정하지 마라.\n` +
      writeAck(),
    { schema: writeSchema(), phase: '작성', label: `작성 r${round}` },
  )
  return writeResult(out, path, round)
}

const ctx = `요청:\n${request}\n${feedback ? `\n사용자 피드백:\n${feedback}\n` : ''}`
const result = await qualityLoop({
  draft: draft,
  // previous 만 있으면 먼저 그대로 평가, 피드백이 있으면 previous 에서 출발해 반영본부터 작성
  initial: (A.previous && !feedback) ? String(A.previous) : null,
  seed: (A.previous && feedback) ? String(A.previous) : null,
  docKind: '분석서',
  context: ctx,
})

// ---------------------------------------------------------------------------
// 4) 확정
// ---------------------------------------------------------------------------
phase('확정')
let finalPath = null
if (result.bestPath) {
  const copied = await agent(`${result.bestPath} 의 내용을 그대로 ${FINAL} 로 복사하라(덮어쓰기). 완료 후 "ok" 만 반환.`,
    { model: 'haiku', phase: '확정', label: '확정본 복사', effort: 'low' })
  // 복사 에이전트가 실패하면 FINAL 이 없을 수 있으니, 그 경우 라운드 본(bestPath)을 경로로 돌려준다(없는 파일을 성공으로 반환하지 않는다).
  finalPath = copied ? FINAL : result.bestPath
}
return Object.assign({ phase: 'analysis', path: finalPath }, result)

// ===========================================================================
// 공통: 품질 루프 (analyze.js / design.js 동일 구현 — 워크플로는 import 불가)
// ===========================================================================
// 작성 결과 계약: 작성 에이전트는 파일을 쓴 뒤 다시 읽어 확인하고 { written, path, bytes, reason } 를 반환한다.
// 0.4.0 결함(쓰기 도구 없는 에이전트가 실패 문장을 반환 → 'out 이 truthy' 라 성공 처리 → 없는 파일을 채점)을 막는다.
function writeSchema() {
  return {
    type: 'object',
    required: ['written', 'path'],
    properties: { written: { type: 'boolean' }, path: { type: 'string' }, bytes: { type: 'integer' }, reason: { type: 'string' } },
  }
}
function writeAck() {
  return '파일을 쓴 뒤 같은 경로를 다시 읽어 내용이 실제로 저장됐는지 확인하고 { written, path, bytes, reason } 로 반환하라. ' +
    '쓰기 도구가 없거나 쓰기·확인에 실패했으면 본문을 반환값에 싣지 말고 written=false 와 reason(원인)을 반환하라. 확인하지 않은 written=true 는 금지한다.'
}
// written=true 가 아니면 경로 대신 { error } 를 돌려 qualityLoop 가 점수 0 루프 없이 즉시 'error' 로 중단하게 한다.
function writeResult(out, path, round) {
  if (!out) return { error: `r${round} 작성 에이전트 결과 없음(null) — ${path}` }
  if (out.written !== true) return { error: `r${round} 작성 실패 — ${String(out.reason || '원인 미보고').slice(0, 300)} (${path})` }
  if (typeof out.bytes === 'number' && out.bytes <= 0) return { error: `r${round} 작성 파일이 비어 있음 (${path})` }
  return path
}

function resolveQuality(q, defaults) {
  q = q || {}
  const LEVELS = Object.assign(Object.create(null), { standard: [75, 60], high: [85, 70], strict: [92, 80] })  // null-proto: q.level 이 constructor/toString 등이어도 상속값이 아닌 undefined → || LEVELS.high 폴백 동작
  const lv = LEVELS[q.level] || LEVELS.high
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const criteria0 = (Array.isArray(q.criteria) && q.criteria.length ? q.criteria : defaults)
    .map((c, i) => (typeof c === 'string'
      ? { key: `c${i + 1}`, weight: 1, desc: c }
      : (c && typeof c === 'object'
        ? { key: String(c.key || `c${i + 1}`), weight: Math.max(0.0001, num(c.weight, 1)), desc: String(c.desc || c.key || `c${i + 1}`) }
        : { key: `c${i + 1}`, weight: 1, desc: String(c) })))  // null/숫자 등 비정상 요소도 TypeError 없이 수용
  const _sk = Object.create(null)  // key 중복 제거(같은 key 면 per/gaps 집계가 섞임)
  const criteria = criteria0.map((c, i) => { let k = c.key; if (_sk[k]) k = `${k}_${i + 1}`; _sk[k] = true; return Object.assign({}, c, { key: k }) })
  return {
    target: clamp(num(q.target, lv[0]), 0, 100),
    floor: clamp(num(q.floor, lv[1]), 0, 100),
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
      targetMissing: { type: 'boolean' },
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
    const mustList = Q.mustHave.length ? `\n필수 항목(아래 '번호'로 각각 충족 여부 판정 — mustHave 에 {item: "번호", met} 로 반환):\n${Q.mustHave.map((m, mi) => `${mi + 1}. ${m}`).join('\n')}` : ''
    const verdicts = (await parallel(LENSES.slice(0, Q.judges).map((l) => () =>
      agent(
        `${opt.context}\n평가 대상 ${opt.docKind}: ${path} (파일을 읽어라. 필요하면 코드도 확인하라. 아무것도 수정하지 마라.)\n\n` +
          `당신의 관점: ${l.ask}\n\n아래 기준마다 0~100 점수와, 점수를 올리려면 보완할 구체적 지적(gaps)을 반환하라. ` +
          `90 이상은 "이대로 다음 단계에 넘겨도 문제없음", 70 은 "쓸 만하지만 보완 필요", 50 이하는 "재작성 수준"이다. ` +
          `관대하게 주지 마라.\n평가 대상 파일이 없거나 비어 있어 읽을 수 없으면 채점하지 말고 targetMissing=true, scores=[] 로 반환하라.\n` +
          `기준:\n${critList}${mustList}`,
        { schema: JUDGE_SCHEMA, model: 'sonnet', phase: '평가', label: `평가 r${round}:${l.key}` },
      ))))
      .filter(Boolean)
    if (!verdicts.length) return null
    // 심사 전 차단: 과반이 '대상 파일 없음'을 보고하면 채점하지 않는다(없는 파일에 0점 → 품질 미달로 위장되던 문제)
    const missingVotes = verdicts.filter((v) => v.targetMissing === true).length
    if (missingVotes * 2 > verdicts.length) return { missing: missingVotes, judges: verdicts.length }

    const per = Object.create(null)   // 심사자 반환 key 로 인덱싱하므로 프로토타입 오염 방지(constructor 등)
    const gaps = Object.create(null)
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
    const _nrm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '')
    // 심사자는 프롬프트에서 부여한 '번호'로 필수 항목을 판정한다(mustList 참조). 번호 매칭 우선,
    // 번호가 없을 때만 정규화 '정확 일치'로 폴백한다(부분일치는 'API'↔'API 인증' 류 오매칭을 내므로 제거).
    const must = Q.mustHave.map((item, mi) => {
      const ni = _nrm(item)
      const votes = verdicts.map((v) => (v.mustHave || []).find((m) => {
        const t = String(m.item).trim()
        return /^\d+$/.test(t) ? (parseInt(t, 10) === mi + 1) : (_nrm(m.item) === ni)  // '순수 숫자'만 번호 — '2FA 지원' 류가 parseInt 로 2번에 오매칭되지 않도록
      })).filter(Boolean)
      const assessed = votes.length > 0
      const yes = votes.filter((m) => m.met).length
      return { item: item, assessed: assessed, met: assessed && yes * 2 > votes.length, votes: assessed ? `${yes}/${votes.length}` : '0/0(미평가)' }
    })
    // 게이트: 평가된 필수항목이 하나라도 과반 미충족이면 차단. 필수항목이 있는데 '절반 넘게 미평가'면
    // 심사 누락으로 보고 차단(이전 '미평가=자동통과' 구멍 제거). 미평가가 소수면 개별로는 차단하지 않아
    // '정확불일치로 영원히 미통과'하던 회귀는 피한다.
    const assessedCnt = must.filter((m) => m.assessed).length
    const mustFailed = must.some((m) => m.assessed && !m.met)
    const mustUnknownMajority = Q.mustHave.length > 0 && assessedCnt * 2 < Q.mustHave.length
    const passed = score >= Q.target && min >= Q.floor && !mustFailed && !mustUnknownMajority
    // 약한 기준 순으로 지적 정리
    const ordered = Q.criteria.slice().sort((a, b) => crit[a.key] - crit[b.key])
    const gapText = ordered
      .filter((c) => crit[c.key] < 100)
      .map((c) => `[${c.key} ${crit[c.key]}점] ${c.desc}\n` + Array.from(new Set(gaps[c.key])).slice(0, 8).map((g) => `  - ${g}`).join('\n'))
      .join('\n') +
      (must.some((m) => m.assessed && !m.met) ? `\n[필수 항목 미충족]\n${must.filter((m) => m.assessed && !m.met).map((m) => `  - ${m.item}`).join('\n')}` : '') +
      (must.some((m) => !m.assessed) ? `\n[필수 항목 판정 불가${mustUnknownMajority ? ' — 과반 미평가 → 통과 차단' : ' — 소수(통과엔 미반영)'}]\n${must.filter((m) => !m.assessed).map((m) => `  - ${m.item}`).join('\n')}` : '')
    return { score: score, min: Math.round(min * 10) / 10, criteria: crit, mustHave: must, passed: passed, gapText: gapText, judges: verdicts.length }
  }

  const history = []
  let best = null
  let path = opt.initial
  let evalr = null
  let stale = 0
  let stopReason = 'maxRounds'
  let error = null

  for (let round = 1; round <= Q.maxRounds; round++) {
    // 작성 (initial 문서가 있으면 1라운드는 그 문서를 먼저 평가)
    if (!(round === 1 && path)) {
      const d = await opt.draft(round, best ? best.path : (opt.seed || null),
        evalr ? evalr.gapText : '(평가 전 — 사용자 피드백을 반영하라)')
      if (typeof d !== 'string' || !d) { stopReason = 'error'; error = (d && d.error) || `r${round} 작성 실패`; log(`⚠ ${error}`); break }
      path = d
    }
    evalr = await evaluate(round, path)
    if (!evalr) { stopReason = 'error'; error = `r${round} 평가 실패(심사 결과 없음)`; log(`⚠ ${error}`); break }
    if (evalr.missing) {
      stopReason = 'error'
      error = `r${round} 평가 대상 ${path} 없음 또는 빈 파일 — 심사 ${evalr.missing}/${evalr.judges}명 보고(채점하지 않고 중단)`
      log(`⚠ ${error}`); break
    }
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
    error: error,
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
