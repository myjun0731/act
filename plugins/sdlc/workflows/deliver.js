export const meta = {
  name: 'deliver',
  description: 'SDLC 자동 구간 연계: implement → test → review (미해결 시 test(verify)·review 재사이클) → report 를 게이트 규칙에 따라 한 번에 실행한다',
  whenToUse: '분석·설계를 사용자가 확정한 뒤, 나머지 단계를 한 번에 돌릴 때. args: { dir, baseRef, maxCycles, maxFixRounds, maxBuildFixes, history }. 리프 4개를 중첩 호출하므로 설치 규모 large 권장. ⚠️ 코드 변경(커밋 없음).',
  phases: [
    { title: '구현', detail: 'sdlc:implement (+실패 작업 1회 재시도)' },
    { title: '검증', detail: 'sdlc:test ↔ sdlc:review 사이클' },
    { title: '완료', detail: 'sdlc:report' },
  ],
}

// 오케스트레이터: 리프만 호출한다(중첩 1단 — 리프는 workflow() 를 쓰지 않음).
const A = (args && typeof args === 'object') ? args : {}
const maxCycles = (typeof A.maxCycles === 'number') ? A.maxCycles : 2
const steps = []
// 호출하는 리프 목록(scripts/check_refs.py 가 `sdlc:<리프>` 참조를 이 배열로 검증한다)
const LEAVES = ['implement', 'test', 'review', 'report']

async function leaf(name, a) {
  if (LEAVES.indexOf(name) < 0) throw new Error(`unknown leaf ${name}`)
  log(`▶ sdlc:${name}`)
  try {
    const r = await workflow(`sdlc:${name}`, Object.assign({}, A, a || {}))
    steps.push({ step: name, ok: true, result: r })
    return r
  } catch (e) {
    const msg = String((e && e.message) ? e.message : e)
    steps.push({ step: name, ok: false, error: msg })
    return null
  }
}

let status = 'completed'
let blocker = ''

phase('구현')
let impl = await leaf('implement')
if (impl && impl.failed && impl.failed.length) {
  log(`실패 작업 ${impl.failed.join(', ')} 재시도`)
  const retry = await leaf('implement', { only: impl.failed })
  if (retry) impl = Object.assign({}, impl, { buildOk: retry.buildOk, failed: retry.failed, buildErrors: retry.buildErrors })
}
if (!impl || !impl.buildOk) { status = 'blocked'; blocker = `구현/빌드 실패: ${impl ? impl.buildErrors || impl.failed : '구현 워크플로 실패'}` }

phase('검증')
let test = null
let review = null
if (status !== 'blocked') {
  for (let c = 1; c <= maxCycles; c++) {
    test = await leaf('test', { mode: c === 1 ? 'full' : 'verify', testCmd: impl.testCmd || undefined })
    if (test && test.stopReason === 'env') { status = 'blocked'; blocker = '테스트 환경 문제'; break }
    review = await leaf('review', { testCmd: impl.testCmd || undefined })
    const clean = test && test.passed && review && review.unresolvedHigh === 0 && review.testsPass !== false
    log(`사이클 ${c}: 테스트 ${test && test.passed ? '통과' : '실패'}, 미해결 high+ ${review ? review.unresolvedHigh : '?'}`)
    if (clean) break
    if (c === maxCycles) { status = 'partial'; blocker = '사이클 한도 내 미해결(테스트 실패 또는 high 이상 리뷰 지적)' }
  }
}

phase('완료')
const outcome = { status: status, blocker: blocker, steps: steps.map((s) => ({ step: s.step, ok: s.ok, error: s.error })) }
const report = await leaf('report', { outcome: outcome, history: A.history || null })
return {
  status: status,
  blocker: blocker,
  implementation: impl ? { buildOk: impl.buildOk, done: impl.done, total: impl.total, failed: impl.failed } : null,
  test: test ? { passed: test.passed, failedCount: test.failedCount, fixRounds: test.fixRounds } : null,
  review: review ? { confirmed: review.confirmed, fixed: review.fixed, unresolvedHigh: review.unresolvedHigh } : null,
  reportPath: report ? report.path : null,
}
