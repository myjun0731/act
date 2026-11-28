export const meta = {
  name: 'deliver',
  description: 'SDLC 자동 구간 연계: implement → test → review (미해결 시 test(verify)·review 재사이클) → report 를 게이트 규칙에 따라 한 번에 실행한다',
  whenToUse: '분석·설계를 사용자가 확정한 뒤, 나머지 단계를 한 번에 돌릴 때. args: { dir, baseRef, maxCycles, maxFixRounds, maxBuildFixes, history, augment?:bool, coverage?:bool }. augment=true 면 수렴 뒤 dev-toolkit 리프(impact-analysis 등)를 보강 호출해 report 에만 싣는다(게이트 미반영). coverage=true 면 test-coverage-boost(레포 변경)도. sdlc 리프와 dev-toolkit 리프를 1단 호출하므로 설치 규모 large 권장. ⚠️ 코드 변경(커밋 없음).',
  phases: [
    { title: '구현', detail: 'sdlc:implement (+실패 작업 1회 재시도)' },
    { title: '검증', detail: 'sdlc:test ↔ sdlc:review 사이클' },
    { title: '보강', detail: '(opt-in) dev-toolkit 리프로 report 보강' },
    { title: '완료', detail: 'sdlc:report' },
  ],
}

// 오케스트레이터: 리프만 호출한다(중첩 1단 — 리프는 workflow() 를 쓰지 않음).
const A = (args && typeof args === 'object') ? args : {}
const maxCycles = Math.max(1, Math.floor(Number.isFinite(A.maxCycles) ? A.maxCycles : 2))  // 0/음수/NaN 이면 검증 사이클이 통째로 생략돼 거짓 'completed' 가 되므로 최소 1 보장(NaN 도 typeof==='number' 라 isFinite 로 가드)
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
    log(`✖ sdlc:${name} 실패: ${msg}`)  // 실행 중 실패를 바로 보이게(steps 에만 묻혀 '결과 없음'과 구분 안 되는 문제)
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
  // 재시도로 성공한 작업의 changedFiles·done 이 보강 단계(아래 changed 계산)에 빠지지 않도록 tasks·done 도 병합(중복은 대상선정 heuristic 상 무해).
  if (retry) impl = Object.assign({}, impl, {
    buildOk: retry.buildOk, failed: retry.failed, buildErrors: retry.buildErrors,
    tasks: (impl.tasks || []).concat(retry.tasks || []),
    done: (impl.done || []).concat(retry.done || []),
  })
}
if (!impl || !impl.buildOk) { status = 'blocked'; blocker = `구현/빌드 실패: ${impl ? impl.buildErrors || impl.failed : '구현 워크플로 실패'}` }
else if (impl.failed && impl.failed.length) { status = 'partial'; blocker = `구현 실패 작업 잔존(빌드는 통과): ${impl.failed.join(', ')}` }

phase('검증')
let test = null
let review = null
if (status !== 'blocked') {
  for (let c = 1; c <= maxCycles; c++) {
    const tc = impl.testCmd ? { testCmd: impl.testCmd } : {}  // testCmd:undefined 로 leaf 의 Object.assign 이 호출자 A.testCmd 를 덮어쓰지 않도록 키 자체를 넣지 않음
    test = await leaf('test', Object.assign({ mode: c === 1 ? 'full' : 'verify' }, tc))
    if (test && test.stopReason === 'env') { status = 'blocked'; blocker = '테스트 환경 문제'; break }
    review = await leaf('review', tc)
    // test.planFailed(계획 실패로 새 테스트 미작성)면 기존 테스트만 통과해도 clean 으로 보지 않는다.
    const clean = test && test.passed && !test.planFailed && review && review.unresolvedHigh === 0 && review.testsPass !== false
    log(`사이클 ${c}: 테스트 ${test && test.passed ? '통과' : '실패'}, 미해결 high+ ${review ? review.unresolvedHigh : '?'}`)
    if (clean) break
    if (c === maxCycles) { status = 'partial'; blocker = (blocker ? blocker + ' / ' : '') + '사이클 한도 내 미해결(테스트 실패 또는 high 이상 리뷰 지적)' }
  }
}

// 보강(opt-in: args.augment): test↔review 사이클 수렴 뒤 1회만(루프 아님), dev-toolkit "리프" 워크플로를
// 1단 형제로 호출한다. 오케스트레이터는 금지(deliver→오케스트레이터→... = 2단 중첩 → 런타임 throw).
// 결과(마크다운 문자열)는 게이트에 절대 넣지 않고 outcome.augment 로 report 보강에만 흐른다(결정성 보존).
const augment = []
if (A.augment && status !== 'blocked') {
  phase('보강')
  const AUGMENT_LEAVES = ['impact-analysis', 'sql-db-audit', 'migration-verify', 'test-coverage-boost']  // 리프만(오케스트레이터 미포함)
  const low = (f) => String(f || '').toLowerCase()
  const changed = (impl && Array.isArray(impl.tasks)) ? impl.tasks.reduce((a, t) => a.concat(t.changedFiles || []), []) : []
  const targets = ['impact-analysis']  // 변경 영향·회귀 계획은 항상
  // SQL/매퍼: .sql 또는 매퍼 XML 경로일 때만(pom.xml 등 무관 XML 제외)
  if (changed.some((f) => /\.sql$/.test(low(f)) || /(mapper\.xml$|\/mappers?\/)/.test(low(f)))) targets.push('sql-db-audit')
  // 이관/DDL/엔티티: 구체 경로·확장자일 때만(entit 광범위 매칭 회피)
  if (changed.some((f) => /(migration|flyway|liquibase|changelog|\.ddl$)/.test(low(f)) || /(entity\.java$|\/entit(y|ies)\/)/.test(low(f)))) targets.push('migration-verify')
  const picked = targets.filter((t) => AUGMENT_LEAVES.indexOf(t) >= 0)  // 화이트리스트(오케스트레이터 차단)
  const runLeafAug = async (name) => {
    log(`▶ 보강 dev-toolkit:${name}`)
    try {
      const r = await workflow(`dev-toolkit:${name}`, A.baseRef ? { target: A.baseRef } : {})
      const rep = (typeof r === 'string') ? r : (r == null ? '' : JSON.stringify(r))  // 객체 반환 시 '[object Object]' 방지
      return { step: name, ok: true, report: rep.slice(0, 8000) }
    } catch (e) {
      return { step: name, ok: false, error: String((e && e.message) ? e.message : e) }
    }
  }
  // 읽기 전용 리프는 병렬(직렬 await 지연 합산 회피). 결과 순서는 비결정이라 report 용일 뿐.
  const roResults = await Promise.all(picked.map((name) => runLeafAug(name)))
  augment.push.apply(augment, roResults)
  // 테스트 "생성"(레포 변경)은 게이트 뒤라 재검증되지 않는다 — 마지막에 직렬로, gateUnverified 로 명시.
  if (A.coverage && AUGMENT_LEAVES.indexOf('test-coverage-boost') >= 0) {
    const cov = await runLeafAug('test-coverage-boost')
    cov.gateUnverified = true
    augment.push(cov)
    log('⚠ test-coverage-boost 는 게이트 뒤 레포 변경 — 재검증 안 됨(보고서에 gateUnverified 표기)')
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
  // 보고서 파일이 저장되지 않았으면(쓰기 거부 등) 경로 대신 원인과 본문을 돌려준다 — 없는 파일을 가리키지 않음
  reportError: report ? (report.error || null) : '보고서 단계 실패',
  report: (report && !report.path) ? (report.report || '') : undefined,
}
