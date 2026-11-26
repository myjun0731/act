export const meta = {
  name: 'implement',
  description: 'SDLC 구현 단계: 설계서의 작업 목록을 의존 순서·파일 충돌 없는 묶음(웨이브)으로 나눠 병렬 구현 → 빌드 검증·수정 → 구현 기록(03-implementation.md)',
  whenToUse: '/sdlc:pipeline 의 3단계(Claude 자동 호출). 설계 확정 후. args: { dir, only:[TASK id], maxBuildFixes }. ⚠️ 레포 코드를 변경한다(커밋은 하지 않음).',
  phases: [
    { title: '준비', detail: '작업 목록·빌드 명령 로드, 웨이브 계산' },
    { title: '구현', detail: '웨이브별 병렬 구현(파일 비중첩)' },
    { title: '빌드', detail: '빌드 실행·오류 수정' },
    { title: '기록', detail: '03-implementation.md' },
  ],
}

const A = (args && typeof args === 'object') ? args : {}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const design = `${dir}/02-design.md`
const analysis = `${dir}/01-analysis.md`
const TASKS = String(A.tasksPath || `${dir}/02-tasks.json`)
const OUT = `${dir}/03-implementation.md`
const only = Array.isArray(A.only) ? A.only.map(String) : null
const maxBuildFixes = (typeof A.maxBuildFixes === 'number') ? A.maxBuildFixes : 3

// 1) 준비 -------------------------------------------------------------------
phase('준비')
const LOAD_SCHEMA = {
  type: 'object',
  required: ['tasks'],
  properties: {
    buildCmd: { type: 'string' }, testCmd: { type: 'string' },
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
const plan = await agent(
  `${TASKS} 를 읽어 그대로 반환하라. 파일이 없으면 ${design} 의 "작업 분해"에서 작업 목록을, ${analysis} 의 "빌드·테스트 실행 방법"에서 buildCmd·testCmd 를 추출하라. 아무것도 수정하지 마라.`,
  { schema: LOAD_SCHEMA, model: 'haiku', phase: '준비', label: '작업 로드', effort: 'low' },
)
if (!plan || !plan.tasks || !plan.tasks.length) {
  return { phase: 'implementation', buildOk: false, stopReason: 'no-tasks', note: `작업 목록을 찾지 못함: ${TASKS}` }
}
let tasks = plan.tasks
if (only) tasks = tasks.filter((t) => only.indexOf(t.id) >= 0)
const ids = new Set(tasks.map((t) => t.id))

// 의존 계층(웨이브) → 계층 안에서 파일이 겹치지 않는 묶음으로 분할 (순수 코드)
const normPath = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
const waves = []
const placed = new Set()
let remaining = tasks.slice()
while (remaining.length) {
  const ready = remaining.filter((t) => (t.dependsOn || []).every((d) => !ids.has(d) || placed.has(d)))
  if (!ready.length) { log(`순환 의존 감지 — 남은 ${remaining.length}개를 순서대로 처리`); ready.push(remaining[0]) }
  const batches = []
  for (const t of ready) {
    const tf = (t.files || []).map(normPath)  // 경로 표기 차이로 같은 파일을 한 묶음에서 동시 수정하지 않도록 정규화
    let b = batches.find((x) => !tf.some((f) => x.files.has(f)))
    if (!b) { b = { files: new Set(), tasks: [] }; batches.push(b) }
    b.tasks.push(t)
    tf.forEach((f) => b.files.add(f))
  }
  batches.forEach((b) => waves.push(b.tasks))
  ready.forEach((t) => placed.add(t.id))
  remaining = remaining.filter((t) => !placed.has(t.id))
}
log(`작업 ${tasks.length}개 → 묶음 ${waves.length}개`)

// 2) 구현 -------------------------------------------------------------------
phase('구현')
const RESULT_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['done', 'partial', 'failed'] },
    changedFiles: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    deviations: { type: 'string', description: '설계와 다르게 구현한 부분과 이유' },
  },
}
const results = {}
for (let w = 0; w < waves.length; w++) {
  const batch = waves[w]
  const out = await parallel(batch.map((t) => () => {
    const blocked = (t.dependsOn || []).filter((d) => results[d] && results[d].status === 'failed')
    if (blocked.length) return Promise.resolve({ id: t.id, status: 'failed', notes: `선행 작업 실패: ${blocked.join(', ')}` })
    return agent(
      `설계서 ${design} 와 분석서 ${analysis} 를 참고해 다음 작업을 구현하라.\n작업(JSON): ${JSON.stringify(t)}\n\n` +
        '규칙:\n- 이 작업의 대상 파일 범위 안에서만 수정하라(다른 작업이 동시에 다른 파일을 수정 중이다). 범위 밖 수정이 꼭 필요하면 하지 말고 notes 에 적어라.\n' +
        '- 기존 코드 관례(구조·네이밍·에러 처리)를 따른다.\n- 전체 빌드·전체 테스트는 실행하지 마라(병렬 작업 중). 단일 파일 문법 확인 정도는 해도 된다.\n' +
        '- 테스트 코드 작성은 다음 단계 몫이다. git commit 하지 마라.\n- 설계와 다르게 구현했다면 deviations 에 이유를 적어라.\n- test-driven-development·systematic-debugging 스킬 지침이 있으면 적용하라.',
      { schema: RESULT_SCHEMA, phase: '구현', label: `구현:${t.id}` },
    ).then((r) => Object.assign({ id: t.id, title: t.title }, r || { status: 'failed', notes: '에이전트 실패' }))
  }))
  out.forEach((r, i) => { const id = batch[i].id; results[id] = r || { id: id, status: 'failed', notes: '에이전트 실패' } })
  log(`묶음 ${w + 1}/${waves.length}: ${out.filter((r) => r && r.status === 'done').length}/${batch.length} 완료`)
}

// 3) 빌드 -------------------------------------------------------------------
phase('빌드')
const BUILD_SCHEMA = {
  type: 'object',
  required: ['buildOk'],
  properties: {
    buildOk: { type: 'boolean' }, attempts: { type: 'integer' },
    command: { type: 'string' }, errors: { type: 'string' },
    fixedFiles: { type: 'array', items: { type: 'string' } },
  },
}
const build = await agent(
  `구현이 끝났다. 빌드(컴파일·타입체크·린트 등 레포에 있는 것)를 실행하라. 명령 후보: ${plan.buildCmd || '(분석서 참고)'}.\n` +
    `실패하면 오류 원인을 고치고 다시 빌드하라(최대 ${maxBuildFixes}회). 고칠 때 설계서 ${design} 의 의도를 지켜라. ` +
    '빌드 명령이 없는 레포라면 가능한 정적 확인을 하고 buildOk 를 그 결과로 판단하라. 테스트 실행은 하지 마라. systematic-debugging 스킬 지침이 있으면 적용하라. git commit 하지 마라.',
  { agentType: 'dev-toolkit:build-error-resolver', schema: BUILD_SCHEMA, phase: '빌드', label: '빌드 검증' },
)

// 4) 기록 -------------------------------------------------------------------
phase('기록')
const list = tasks.map((t) => results[t.id] || { id: t.id, status: 'failed', notes: '미실행' })
await agent(
  `다음 구현 결과로 ${OUT} 를 한국어 마크다운으로 작성하라${only ? '(이번은 재시도 실행이니 기존 파일이 있으면 "재시도" 절을 덧붙여라)' : ''}. ` +
    '구성: 요약(완료/부분/실패 수, 빌드 결과), 작업별 표(ID·제목·상태·변경 파일·비고), 설계 이탈 사항, 빌드 로그 요약.\n' +
    JSON.stringify({ tasks: list, build: build }),
  { model: 'sonnet', phase: '기록', label: '구현 기록', effort: 'low' },
)

const failed = list.filter((r) => r.status !== 'done').map((r) => r.id)
return {
  phase: 'implementation',
  path: OUT,
  buildOk: !!(build && build.buildOk),
  buildErrors: build ? build.errors || '' : '빌드 에이전트 실패',
  done: list.filter((r) => r.status === 'done').length,
  total: list.length,
  failed: failed,
  testCmd: plan.testCmd || '',
  tasks: list.map((r) => ({ id: r.id, status: r.status, changedFiles: r.changedFiles || [], deviations: r.deviations || '' })),
}
