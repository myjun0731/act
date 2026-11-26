export const meta = {
  name: 'test',
  description: 'SDLC 테스트 단계: 설계서의 테스트 전략(AC→TC)으로 테스트 작성 → 실행 → 실패 원인 수정 → 재실행을 통과하거나 한도에 닿을 때까지 반복 → 04-test.md',
  whenToUse: '/sdlc:pipeline 의 4단계(Claude 자동 호출). args: { dir, mode:"full"|"verify", maxFixRounds }. verify 는 테스트 작성 없이 실행·수정 루프만(재사이클용). ⚠️ 테스트 파일 생성·코드 수정.',
  phases: [
    { title: '계획', detail: 'AC → 테스트 단위' },
    { title: '작성', detail: '테스트 파일 작성(단위별 병렬)' },
    { title: '실행', detail: '테스트 실행·결과 수집' },
    { title: '수정', detail: '실패 원인 수정(파일 비중첩 병렬)' },
    { title: '기록', detail: '04-test.md' },
  ],
}

const A = (args && typeof args === 'object') ? args : {}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const design = `${dir}/02-design.md`
const analysis = `${dir}/01-analysis.md`
const OUT = `${dir}/04-test.md`
const mode = A.mode === 'verify' ? 'verify' : 'full'
const maxFixRounds = (typeof A.maxFixRounds === 'number') ? A.maxFixRounds : 3

// 1) 계획 + 2) 작성 (full 모드) ----------------------------------------------
let testCmd = A.testCmd ? String(A.testCmd) : ''
let written = []
let planFailed = false
if (mode === 'full') {
  phase('계획')
  const PLAN_SCHEMA = {
    type: 'object',
    required: ['units'],
    properties: {
      testCmd: { type: 'string' },
      units: {
        type: 'array',
        items: {
          type: 'object',
          required: ['testFile', 'cases'],
          properties: {
            testFile: { type: 'string', description: '레포 루트 기준 테스트 파일 경로(단위마다 서로 달라야 함)' },
            target: { type: 'string' },
            cases: { type: 'array', items: { type: 'string', description: 'TC-xx: AC-xxx 대응 — 기대 동작' } },
          },
        },
      },
    },
  }
  const plan = await agent(
    `설계서 ${design} 의 "테스트 전략"과 "요구 추적표", 분석서 ${analysis} 의 수용기준·빌드·테스트 방법을 읽고, ` +
      '레포의 기존 테스트 프레임워크·위치 관례에 맞춰 테스트 단위(테스트 파일 하나 = 단위 하나)를 계획하라. 모든 AC 가 최소 하나의 케이스로 덮여야 한다. ' +
      '이미 있는 테스트 파일에 추가하는 게 관례라면 그 경로를 써도 되지만 단위끼리 파일이 겹치면 안 된다. 아무것도 수정하지 마라.',
    { schema: PLAN_SCHEMA, model: 'sonnet', phase: '계획', label: '테스트 계획' },
  )
  if (!plan) { planFailed = true; log('⚠ 테스트 계획 실패 — 새 테스트 없이 기존 테스트만 실행(AC 커버리지 미보장)') }
  if (plan) {
    testCmd = testCmd || plan.testCmd || ''
    // 같은 파일을 가리키는 단위는 합친다(병렬 쓰기 충돌 방지). 경로(에이전트 반환)로 키를 잡으므로 Object.create(null).
    const byFile = Object.create(null)
    for (const u of plan.units || []) {
      if (!byFile[u.testFile]) byFile[u.testFile] = { testFile: u.testFile, target: u.target || '', cases: [] }
      byFile[u.testFile].cases.push(...(u.cases || []))
    }
    const units = Object.keys(byFile).map((k) => byFile[k])
    log(`테스트 단위 ${units.length}개`)
    phase('작성')
    written = (await parallel(units.map((u) => () =>
      agent(
        `테스트 파일 ${u.testFile} 에 다음 케이스를 작성하라(대상: ${u.target || '설계서 참고'}).\n${u.cases.map((c) => `- ${c}`).join('\n')}\n` +
          `설계서 ${design} 를 참고하라. 레포의 테스트 관례를 따르고, 이 파일만 작성·수정하라. ` +
          '구현 코드는 수정하지 마라(실패는 다음 단계에서 고친다). 작성 후 이 파일만 대상으로 테스트를 한 번 돌려 봐도 된다. test-driven-development·springboot-tdd 스킬 지침이 있으면 적용하라. 결과를 한 줄로 요약해 반환하라.',
        { agentType: 'dev-toolkit:test-automator', phase: '작성', label: `작성:${u.testFile.split('/').pop()}` },
      ).then((r) => ({ testFile: u.testFile, cases: u.cases.length, summary: r || '실패' })),
    ))).filter(Boolean)
  }
}

// 3) 실행 ↔ 4) 수정 루프 ------------------------------------------------------
const RUN_SCHEMA = {
  type: 'object',
  required: ['passed'],
  properties: {
    passed: { type: 'boolean' },
    command: { type: 'string' },
    total: { type: 'integer' }, failedCount: { type: 'integer' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['test', 'kind'],
        properties: {
          test: { type: 'string' }, message: { type: 'string' },
          kind: { type: 'string', enum: ['code', 'test', 'env'], description: 'code=구현 결함, test=테스트가 설계/AC와 다르게 잘못됨, env=환경·의존성 문제' },
          suspect: { type: 'array', items: { type: 'string' }, description: '원인으로 의심되는 파일' },
        },
      },
    },
  },
}

async function runTests(round) {
  return agent(
    `테스트를 실행하라. 명령 후보: ${testCmd || '(분석서 참고)'}. 이번 작업과 관련된 테스트와 기존 회귀 테스트를 모두 포함하라. ` +
      '실패마다 원인을 짧게 진단해 kind 와 의심 파일을 채워라. 아무것도 수정하지 마라.',
    { schema: RUN_SCHEMA, model: 'sonnet', phase: '실행', label: `실행 r${round}` },
  )
}

const rounds = []
let run = await runTests(0)
rounds.push(summ(0, run))
let stopReason = run ? (run.passed ? 'passed' : 'maxFixRounds') : 'run-error'  // run=null(실행 에이전트 실패)을 maxFixRounds 로 가리지 않는다
for (let r = 1; r <= maxFixRounds && run && !run.passed; r++) {
  const fails = run.failures || []
  if (!fails.length) { stopReason = 'unknown-failure'; break }
  if (fails.every((f) => f.kind === 'env')) { stopReason = 'env'; log('환경 문제만 남음 — 수정 루프 중단'); break }
  phase('수정')
  // 의심 파일 기준으로 묶고, 파일이 겹치지 않게 그룹화
  const groups = []
  for (const f of fails.filter((x) => x.kind !== 'env')) {
    const files = (f.suspect && f.suspect.length) ? f.suspect : ['?']
    // 이 실패와 파일이 겹치는 기존 그룹을 전부 찾아 하나로 병합한다. 첫 그룹만 합치면 서로 다른
    // 그룹이 같은 파일을 공유하게 돼, 병렬 수정이 같은 파일을 동시에 건드릴 수 있다.
    const hit = groups.filter((x) => files.some((p) => x.files.has(p)))
    let g
    if (!hit.length) { g = { files: new Set(), fails: [] }; groups.push(g) }
    else {
      g = hit[0]
      for (let i = 1; i < hit.length; i++) {
        hit[i].files.forEach((p) => g.files.add(p))
        hit[i].fails.forEach((x) => g.fails.push(x))
        groups.splice(groups.indexOf(hit[i]), 1)
      }
    }
    files.forEach((p) => g.files.add(p))
    g.fails.push(f)
  }
  await parallel(groups.map((g, i) => () =>
    agent(
      `다음 테스트 실패를 고쳐라:\n${JSON.stringify(g.fails)}\n설계서 ${design}·분석서 ${analysis} 의 의도가 기준이다.\n` +
        '- 원인이 구현이면 구현을 고친다.\n- 테스트가 설계/AC 와 다르게 잘못 작성된 경우에만 테스트를 고치고, 그 근거를 반환문에 적는다.\n' +
        '- 테스트 삭제·skip·단언 약화로 통과시키지 마라.\n' +
        `- 가능한 한 다음 파일 범위에서만 수정하라(다른 수정이 병렬 진행 중): ${Array.from(g.files).join(', ')}\n` +
        '해당 테스트만 다시 돌려 확인한 뒤, 무엇을 왜 고쳤는지 짧게 반환하라. git commit 하지 마라.',
      { phase: '수정', label: `수정 r${r}:${i + 1}` },
    )))
  run = await runTests(r)
  rounds.push(summ(r, run))
  log(`r${r}: ${run && run.passed ? '통과' : `실패 ${run ? run.failedCount || (run.failures || []).length : '?'}건`}`)
  if (run && run.passed) stopReason = 'passed'
  else if (!run) { stopReason = 'run-error'; break }
}

// 5) 기록 -------------------------------------------------------------------
phase('기록')
await agent(
  `다음 테스트 결과로 ${OUT} 를 한국어 마크다운으로 작성하라${mode === 'verify' ? '(재검증 실행이니 기존 파일이 있으면 "재검증" 절을 덧붙여라)' : ''}. ` +
    `구성: 요약(통과 여부·총/실패 수·수정 라운드), AC 커버리지 표(설계서 ${design} 의 AC → TC → 테스트 파일 → 결과), ` +
    '라운드별 실패·수정 이력, 남은 실패와 원인 진단, 테스트를 수정한 경우 그 근거.\n' +
    JSON.stringify({ mode: mode, written: written, rounds: rounds, last: run }),
  { model: 'sonnet', phase: '기록', label: '테스트 기록', effort: 'low' },
)

return {
  phase: 'test',
  path: OUT,
  mode: mode,
  planFailed: planFailed,
  passed: !!(run && run.passed && !((run.total || 0) === 0 && mode === 'full')),  // full 모드에서 실행 0건을 '빈 통과'로 보지 않음
  stopReason: stopReason,
  total: run ? run.total || 0 : 0,
  failedCount: run ? (run.failedCount || (run.failures || []).length) : 0,
  remaining: run && !run.passed ? (run.failures || []).slice(0, 20) : [],
  fixRounds: rounds.length - 1,
  testFiles: written.map((w) => w.testFile),
}

function summ(r, x) {
  return x ? { round: r, passed: x.passed, total: x.total, failed: x.failedCount, failures: (x.failures || []).map((f) => `${f.kind}:${f.test}`) } : { round: r, error: '실행 에이전트 실패' }
}
