export const meta = {
  name: 'review',
  description: 'SDLC 리뷰 단계: 변경분을 설계 준수·정확성·보안·성능·유지보수 5차원으로 리뷰 → 지적마다 반박 검증 → 확정된 critical/high/medium 수정 → 테스트 재실행 → 05-review.md',
  whenToUse: '/sdlc:pipeline 의 5단계(Claude 자동 호출). args: { dir, baseRef, fix:true, testCmd }. baseRef 가 없으면 HEAD 대비 작업 트리 변경을 본다. ⚠️ fix=true 면 코드를 수정한다.',
  phases: [
    { title: '범위', detail: '변경 파일 수집' },
    { title: '리뷰', detail: '5차원 병렬 리뷰' },
    { title: '검증', detail: '지적별 반박 검증' },
    { title: '수정', detail: '확정 지적 수정·테스트 재실행' },
    { title: '기록', detail: '05-review.md' },
  ],
}

const A = (args && typeof args === 'object') ? args : {}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const design = `${dir}/02-design.md`
const analysis = `${dir}/01-analysis.md`
const OUT = `${dir}/05-review.md`
const base = A.baseRef ? String(A.baseRef) : 'HEAD'
const doFix = A.fix !== false

// 1) 범위 -------------------------------------------------------------------
phase('범위')
const SCOPE_SCHEMA = { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } }
const scope = await agent(
  `git diff --name-only ${base} 와 git ls-files --others --exclude-standard 로 변경·신규 파일을 모아 반환하라. ${dir}/ 아래 산출물은 제외하라. 아무것도 수정하지 마라.`,
  { schema: SCOPE_SCHEMA, phase: '범위', label: '변경 파일', effort: 'low' },
)
const files = scope && scope.files ? scope.files : []
log(`변경 파일 ${files.length}개`)
if (!files.length) return { phase: 'review', path: null, confirmed: 0, unresolvedHigh: 0, note: '리뷰할 변경이 없음' }

// 2) 리뷰 → 3) 검증 (pipeline: 차원별로 끝나는 대로 검증 시작) --------------
const FIND_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'title'],
        properties: {
          file: { type: 'string' }, line: { type: 'integer' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          title: { type: 'string' }, detail: { type: 'string' }, fix: { type: 'string' },
        },
      },
    },
  },
}
const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted'],
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } },
}
const DIMS = [
  { key: 'conformance', ask: '설계 준수·요구 추적 — 설계서의 구조·인터페이스와 다르게 구현됐거나, 분석서의 REQ/AC 중 구현되지 않은 것' },
  { key: 'correctness', ask: '정확성 — 로직 오류, 경계값, null/빈 값, 동시성, 에러 처리 누락, 기존 동작 회귀' },
  { key: 'security', ask: '보안 — 입력 검증, 인젝션, 권한 확인, 비밀정보 노출, 안전하지 않은 기본값' },
  { key: 'performance', ask: '성능 — 불필요한 반복 I/O·N+1 쿼리, 비효율 자료구조, 자원 누수' },
  { key: 'maintainability', ask: '유지보수 — 기존 관례 위반, 중복, 과도한 복잡도, 죽은 코드, 누락된 테스트' },
]

const verified = await pipeline(
  DIMS,
  (d) => agent(
    `변경 파일: ${files.join(', ')}\n변경 내용은 git diff ${base} 로 보라(신규 파일은 전체). 설계서 ${design}, 분석서 ${analysis} 를 기준으로 삼아라.\n` +
      `관점: ${d.ask}\n이 관점의 실제 결함만 보고하라(스타일 취향 제외). 변경되지 않은 코드의 기존 문제는 변경이 그것을 악화시킬 때만. 아무것도 수정하지 마라.`,
    { schema: FIND_SCHEMA, phase: '리뷰', label: `리뷰:${d.key}` },
  ),
  (r, d) => parallel(((r && r.findings) || []).map((f) => () =>
    agent(
      `다음 리뷰 지적을 반박하려 시도하라. 코드를 직접 열어 확인하라. 실제 결함이 아니거나 확신할 수 없으면 refuted=true.\n` +
        `실제라면 refuted=false 와 적절한 severity 를 반환하라.\n지적(${d.key}): ${JSON.stringify(f)}`,
      { schema: VERDICT_SCHEMA, phase: '검증', label: `검증:${d.key}:${(f.file || '').split('/').pop()}` },
    ).then((v) => (v && !v.refuted ? Object.assign({ dim: d.key }, f, { severity: v.severity || f.severity, verifyNote: v.reason || '' }) : null)),
  )).then((xs) => xs.filter(Boolean)),
)
const all = verified.filter(Boolean).flat()
// 같은 위치·제목 중복 제거
const seen = new Set()
const confirmed = all.filter((f) => {
  const k = `${f.file}:${f.line || 0}:${(f.title || '').slice(0, 40)}`
  if (seen.has(k)) return false
  seen.add(k); return true
})
const RANK = { critical: 0, high: 1, medium: 2, low: 3 }
confirmed.sort((a, b) => RANK[a.severity] - RANK[b.severity])
log(`확정 지적 ${confirmed.length}건 (critical ${confirmed.filter((f) => f.severity === 'critical').length}, high ${confirmed.filter((f) => f.severity === 'high').length})`)

// 4) 수정 -------------------------------------------------------------------
let fixes = []
let retest = null
const toFix = doFix ? confirmed.filter((f) => f.severity !== 'low') : []
if (toFix.length) {
  phase('수정')
  const byFile = {}
  toFix.forEach((f) => { (byFile[f.file] = byFile[f.file] || []).push(f) })
  fixes = (await parallel(Object.keys(byFile).map((file) => () =>
    agent(
      `파일 ${file} 의 다음 확정 지적을 고쳐라(설계서 ${design} 의 의도 유지, 이 파일 위주로 수정 — 다른 파일도 병렬 수정 중):\n${JSON.stringify(byFile[file])}\n` +
        'git commit 하지 마라. 지적별로 fixed(true/false)와 무엇을 했는지 반환하라.',
      {
        schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['title', 'fixed'], properties: { title: { type: 'string' }, fixed: { type: 'boolean' }, note: { type: 'string' } } } } } },
        phase: '수정', label: `수정:${file.split('/').pop()}`,
      },
    ).then((r) => (r ? r.items.map((it) => Object.assign({ file: file }, it)) : byFile[file].map((f) => ({ file: file, title: f.title, fixed: false, note: '에이전트 실패' })))),
  ))).filter(Boolean).flat()
  retest = await agent(
    `리뷰 수정 후 빌드와 테스트를 실행하라. 명령 후보: ${A.testCmd || '(분석서의 빌드·테스트 방법)'}. 실패하면 원인만 진단해 반환하라(수정하지 마라).`,
    { schema: { type: 'object', required: ['passed'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } }, phase: '수정', label: '재테스트' },
  )
}

// 5) 기록 -------------------------------------------------------------------
phase('기록')
const fixedTitles = new Set(fixes.filter((x) => x.fixed).map((x) => `${x.file}:${x.title}`))
const unresolved = confirmed.filter((f) => f.severity !== 'low' && !fixedTitles.has(`${f.file}:${f.title}`))
await agent(
  `다음 리뷰 결과로 ${OUT} 를 한국어 마크다운으로 작성하라. 이미 파일이 있으면 새 회차 절을 덧붙여라. ` +
    '구성: 요약(차원별·심각도별 건수, 수정/미해결, 재테스트 결과), 확정 지적 표(심각도·차원·위치·내용·조치), 미해결 목록과 권고, low 지적 목록.\n' +
    JSON.stringify({ base: base, files: files, confirmed: confirmed, fixes: fixes, retest: retest }),
  { phase: '기록', label: '리뷰 기록', effort: 'low' },
)

return {
  phase: 'review',
  path: OUT,
  confirmed: confirmed.length,
  bySeverity: ['critical', 'high', 'medium', 'low'].reduce((o, s) => { o[s] = confirmed.filter((f) => f.severity === s).length; return o }, {}),
  fixed: fixes.filter((x) => x.fixed).length,
  unresolved: unresolved.map((f) => ({ severity: f.severity, file: f.file, line: f.line, title: f.title })),
  unresolvedHigh: unresolved.filter((f) => f.severity === 'critical' || f.severity === 'high').length,
  testsPass: retest ? !!retest.passed : null,
}
