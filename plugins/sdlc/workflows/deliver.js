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
const maxCycles = Math.max(1, (typeof A.maxCycles === 'number') ? A.maxCycles : 2)  // 0/음수면 검증 사이클이 통째로 생략돼 거짓 'completed' 가 되므로 최소 1 보장
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
else if (impl.failed && impl.failed.length) { status = 'partial'; blocker = `구현 실패 작업 잔존(빌드는 통과): ${impl.failed.join(', ')}` }

phase('검증')
let test = null
let review = null
if (status !== 'blocked') {
  for (let c = 1; c <= maxCycles; c++) {
    test = await leaf('test', { mode: c === 1 ? 'full' : 'verify', testCmd: impl.testCmd || undefined })
    if (test && test.stopReason === 'env') { status = 'blocked'; blocker = '테스트 환경 문제'; break }
    review = await leaf('review', { testCmd: impl.testCmd || undefined })
    // test.planFailed(계획 실패로 새 테스트 미작성)면 기존 테스트만 통과해도 clean 으로 보지 않는다.
    const clean = test && test.passed && !test.planFailed && review && review.unresolvedHigh === 0 && review.testsPass !== false
    log(`사이클 ${c}: 테스트 ${test && test.passed ? '통과' : '실패'}, 미해결 high+ ${review ? review.unresolvedHigh : '?'}`)
    if (clean) break
    if (c === maxCycles) { status = 'partial'; blocker = '사이클 한도 내 미해결(테스트 실패 또는 high 이상 리뷰 지적)' }
  }
}

// 보강(opt-in: args.augment): test↔review 사이클 수렴 뒤 1회만(루프 아님), dev-toolkit "리프" 워크플로를
// 1단 형제로 호출한다. 오케스트레이터는 금지(deliver→오케스트레이터→... = 2단 중첩 → 런타임 throw).
// 결과(마크다운 문자열)는 게이트에 절대 넣지 않고 outcome.augment 로 report 보강에만 흐른다(결정성 보존).
const augment = []
if (A.augment && status !== 'blocked') {
  phase('보강')
  const AUGMENT_LEAVES = ['impact-analysis', 'sql-db-audit', 'migration-verify', 'test-coverage-boost']  // 리프만(오케스트레이터 미포함)
  const changed = (impl && Array.isArray(impl.tasks)) ? impl.tasks.reduce((a, t) => a.concat(t.changedFiles || []), []) : []
  const targets = ['impact-analysis']  // 변경 영향·회귀 계획은 항상
  if (changed.some((f) => /\.(sql|xml)$/i.test(String(f)))) targets.push('sql-db-audit')         // SQL/매퍼 변경이 있을 때만
  if (changed.some((f) => /(migrat|ddl|schema|entit)/i.test(String(f)))) targets.push('migration-verify')  // 이관/DDL 변경이 있을 때만
  if (A.coverage) targets.push('test-coverage-boost')  // 테스트 "생성"은 레포를 바꾸므로 별도 opt-in
  for (const name of targets) {
    if (AUGMENT_LEAVES.indexOf(name) < 0) continue  // 화이트리스트 밖(=오케스트레이터)은 호출 금지
    log(`▶ 보강 dev-toolkit:${name}`)
    try {
      const r = await workflow(`dev-toolkit:${name}`, A.baseRef ? { target: A.baseRef } : {})
      augment.push({ step: name, ok: true, report: String(r || '').slice(0, 8000) })
    } catch (e) {
      augment.push({ step: name, ok: false, error: String((e && e.message) ? e.message : e) })
    }
  }
}

phase('완료')
const outcome = { status: status, blocker: blocker, augment: augment, steps: steps.map((s) => ({ step: s.step, ok: s.ok, error: s.error })) }
const report = await leaf('report', { outcome: outcome, history: A.history || null })
return {
  status: status,
  blocker: blocker,
  implementation: impl ? { buildOk: impl.buildOk, done: impl.done, total: impl.total, failed: impl.failed } : null,
  test: test ? { passed: test.passed, failedCount: test.failedCount, fixRounds: test.fixRounds } : null,
  review: review ? { confirmed: review.confirmed, fixed: review.fixed, unresolvedHigh: review.unresolvedHigh } : null,
  augment: augment.map((a) => ({ step: a.step, ok: a.ok })),
  reportPath: report ? report.path : null,
}
