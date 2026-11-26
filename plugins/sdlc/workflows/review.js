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
  { schema: SCOPE_SCHEMA, model: 'haiku', phase: '범위', label: '변경 파일', effort: 'low' },
)
// 범위 수집 에이전트 실패(null)와 "진짜 변경 0건"을 구분한다 — 실패를 '깨끗함(PASS)'으로 둔갑시키지 않는다.
if (!scope) return { phase: 'review', path: null, confirmed: 0, unresolvedHigh: 1, blocked: true, note: '범위 수집 에이전트 실패 — 리뷰 미실행(변경 없음과 구분; 게이트는 미해결로 취급)' }
const files = Array.isArray(scope.files) ? scope.files : []
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
// 지적 1건을 반박 검증(제네릭 5차원·전문/보안 레인 공용 — 한쪽만 고쳐 기준이 어긋나지 않도록 단일 헬퍼).
// 검증 에이전트 실패(null)는 폐기하지 않고 미검증으로 보존한다. dimKey 가 있으면 dim 을 부여(없으면 f 의 기존 dim 유지).
function verifyFinding(f, dimKey) {
  const tag = dimKey ? dimKey + ':' : ''
  const dimObj = dimKey ? { dim: dimKey } : {}
  return agent(
    '다음 리뷰 지적을 반박하려 시도하라. 코드를 직접 열어 확인하라. 실제 결함이 아니거나 확신할 수 없으면 refuted=true.\n' +
      '실제라면 refuted=false 와 적절한 severity 를 반환하라.\n지적: ' + JSON.stringify(f),
    { schema: VERDICT_SCHEMA, model: 'sonnet', effort: 'low', phase: '검증', label: `검증:${tag}${(f.file || '').split('/').pop()}` },
  ).then((v) => (v
    ? (v.refuted ? null : Object.assign({}, dimObj, f, { severity: v.severity || f.severity, verifyNote: v.reason || '' }))
    : Object.assign({}, dimObj, f, { verifyNote: '⚠ 검증 에이전트 실패 — 미검증 상태로 보존(조용히 폐기하지 않음)' })))
}
const DIMS = [
  { key: 'conformance', ask: '설계 준수·요구 추적 — 설계서의 구조·인터페이스와 다르게 구현됐거나, 분석서의 REQ/AC 중 구현되지 않은 것' },
  { key: 'correctness', ask: '정확성 — 로직 오류, 경계값, null/빈 값, 동시성, 에러 처리 누락, 기존 동작 회귀' },
  // 보안은 아래 '보안 상시 레인'(security-reviewer)이 전담 — 제네릭 security 차원과의 중복·이중 반박검증을 피하려 제거.
  { key: 'performance', ask: '성능 — 불필요한 반복 I/O·N+1 쿼리, 비효율 자료구조, 자원 누수' },
  { key: 'maintainability', ask: '유지보수 — 기존 관례 위반, 중복, 과도한 복잡도, 죽은 코드, 누락된 테스트' },
]

const laneFailures = []  // 차원·보안 리뷰 에이전트가 null(미실행)한 레인 — 게이트에 '미검증 high'로 반영(거짓 PASS 방지)
const verified = await pipeline(
  DIMS,
  (d) => agent(
    `변경 파일: ${files.join(', ')}\n변경 내용은 git diff ${base} 로 보라(신규 파일은 전체). 설계서 ${design}, 분석서 ${analysis} 를 기준으로 삼아라.\n` +
      `관점: ${d.ask}\n이 관점의 실제 결함만 보고하라(스타일 취향 제외). 변경되지 않은 코드의 기존 문제는 변경이 그것을 악화시킬 때만. 아무것도 수정하지 마라.`,
    { schema: FIND_SCHEMA, model: 'sonnet', phase: '리뷰', label: `리뷰:${d.key}` },
  ),
  (r, d) => {
    if (!r) { laneFailures.push(d.key); log(`⚠ 리뷰 차원 '${d.key}' 에이전트 결과 없음 — '미실행' → unresolvedHigh 에 반영(거짓 PASS 방지)`) }
    return parallel(((r && r.findings) || []).map((f) => () => verifyFinding(f, d.key))).then((xs) => xs.filter(Boolean))
  },
)
// Layer 2 (가산·선택): 변경 파일 유형별 dev-toolkit 전문 리뷰어 + 보안 상시 레인.
// 실패(미설치·에이전트 오류)해도 try/catch·parallel 로 흡수 → 1계층 제네릭 5차원으로 완주한다.
function reviewerFor(type) {
  switch (type) {
    case 'java': return { agentType: 'dev-toolkit:java-reviewer', ask: 'Spring/JPA 계층·트랜잭션·동시성 정확성·보안·유지보수를 코드 관용구 수준으로 심화 리뷰하라' }
    case 'sql_mapper': return { agentType: 'dev-toolkit:sql-pro', ask: 'SQL 정확성·인덱스·실행계획, 5방언(postgresql·tibero·oracle·mysql·mariadb) 일관성, MariaDB→PostgreSQL 이관함정(정수 setString·varchar 일시 컬럼 캐스트·함수/문법 차이)을 심화 점검하라' }
    case 'frontend_react': return { agentType: 'dev-toolkit:react-reviewer', ask: '훅 정확성·렌더 성능·서버/클라이언트 경계·접근성·보안을 심화 리뷰하라' }
    case 'frontend_vue': return { agentType: 'dev-toolkit:vue-reviewer', ask: 'Composition API 정확성·반응성·컴포넌트 구조·템플릿 보안을 심화 리뷰하라' }
    case 'frontend_ts': return { agentType: 'dev-toolkit:typescript-reviewer', ask: '타입 안전성·async 정확성·Node/웹 보안을 심화 리뷰하라' }
    case 'migration': case 'schema': return { agentType: 'dev-toolkit:database-architect', ask: '스키마 설계·제약·인덱스·이관 안전성(무중단·롤백·데이터 정합성)을 심화 리뷰하라' }
    default: return null
  }
}
const CLS_SCHEMA = { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'object', required: ['path', 'type'], properties: { path: { type: 'string' }, type: { type: 'string', enum: ['java', 'sql_mapper', 'frontend_react', 'frontend_vue', 'frontend_ts', 'migration', 'schema', 'config', 'other'] } } } } } }
let typed = []
try {
  const cls = await agent(
    `다음 변경 파일을 유형으로 분류해 반환하라(경로 그대로): ${files.join(', ')}\n` +
      '유형: java(.java)·sql_mapper(MyBatis 매퍼 XML·.sql)·frontend_react(.tsx/.jsx)·frontend_vue(.vue)·frontend_ts(.ts/.js)·migration(마이그레이션·DDL)·schema(스키마/엔티티)·config·other.',
    { schema: CLS_SCHEMA, model: 'haiku', effort: 'low', phase: '리뷰', label: '유형 분류' },
  )
  if (!cls || !Array.isArray(cls.files)) log('유형 분류 결과 없음(null) — 전문(2계층) 리뷰 생략, 제네릭 5차원으로 계속')
  typed = (cls && Array.isArray(cls.files)) ? cls.files : []
} catch (e) { log('유형 분류 실패 — 전문 리뷰 생략, 제네릭 5차원으로 계속') }
// 유형별로 묶어 전문 리뷰어 1회씩 디스패치(비용 억제). 에이전트 반환값으로 키를 잡으므로 Object.create(null)(프로토타입 오염 방지).
const byType = Object.create(null)
for (const f of typed) { const r = reviewerFor(f.type); if (r && f.path) { (byType[f.type] = byType[f.type] || { r: r, files: [] }).files.push(f.path) } }
const expertRaw = (await parallel(Object.keys(byType).map((t) => async () => {
  const g = byType[t]
  try {
    const out = await agent(
      `변경 파일: ${g.files.join(', ')}\n변경분은 git diff ${base} 로 보라(신규 파일은 전체). 설계서 ${design}·분석서 ${analysis} 의 의도를 기준으로 삼아라.\n` +
        `${g.r.ask}\n실제 결함만 findings 로 보고하라(file·severity·title·detail·fix, 스타일 취향 제외). 아무것도 수정하지 마라.`,
      { agentType: g.r.agentType, schema: FIND_SCHEMA, phase: '리뷰', label: `전문:${t}` },
    )
    if (!out) log(`⚠ 전문 리뷰 '${t}' 결과 없음(null) — 이 유형 심화 커버 없음(제네릭층 기본 커버)`)
    return ((out && out.findings) || []).map((f) => Object.assign({ dim: 'specialist' }, f))
  } catch (e) { log(`전문 리뷰 ${t} 생략(제네릭층이 커버)`); return [] }
}))).filter(Boolean).flat()
// 보안 상시 레인: 유형 무관 전 변경 파일 1회(2계층 토글과 무관하게 항상)
let securityRaw = []
try {
  const sec = await agent(
    `변경 파일 전체(${files.join(', ')})를 보안 관점으로 리뷰하라. 변경분은 git diff ${base}.\n` +
      '입력 검증·인젝션·인증/권한 확인·비밀정보 노출·안전하지 않은 기본값·OWASP Top 10 관점의 실제 취약점만 findings 로 보고하라. 아무것도 수정하지 마라.',
    { agentType: 'dev-toolkit:security-reviewer', schema: FIND_SCHEMA, phase: '리뷰', label: '보안 상시' },
  )
  if (!sec) { laneFailures.push('security'); log('⚠ 보안 리뷰 결과 없음(null 반환) → unresolvedHigh 에 반영(보안 커버 공백을 PASS로 두지 않음)') }
  securityRaw = ((sec && sec.findings) || []).map((f) => Object.assign({ dim: 'security' }, f))
} catch (e) { laneFailures.push('security'); log('⚠ 보안 리뷰 생략(예외) — security-reviewer 미사용(dev-toolkit 미설치?). null 경로와 동일하게 보안 커버 공백을 게이트에 반영') }
// 전문/보안 지적도 제네릭과 동일하게 반박검증(독립 평가자 유지 — 전문가를 채점/검증엔 넣지 않는다)
const extra = (await parallel(expertRaw.concat(securityRaw).map((f) => () => verifyFinding(f, null)))).filter(Boolean)

const all = verified.filter(Boolean).flat().concat(extra)
const RANK = { critical: 0, high: 1, medium: 2, low: 3 }
const _nf = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '')  // './a.java' 와 'a.java' 를 같은 키로
// 같은 위치·제목 중복 제거 — 충돌 시 '가장 높은 severity'를 남긴다(dedup 이 정렬보다 먼저라, 같은 키의 high 가
// medium 사본에 밀려 버려지면 unresolvedHigh 과소집계되던 문제 방지). title 은 소문자·공백제거 후 앞 40자(한글 보존).
const _dk = (f) => `${_nf(f.file)}:${f.line || 0}:${String(f.title || '').toLowerCase().replace(/\s+/g, '').slice(0, 40)}`
const _byKey = new Map()
const _rk = (s) => (RANK[s] == null ? 9 : RANK[s])
for (const f of all) {
  const k = _dk(f); const prev = _byKey.get(k)
  if (!prev || _rk(f.severity) < _rk(prev.severity)) _byKey.set(k, f)
}
const confirmed = Array.from(_byKey.values())
confirmed.sort((a, b) => RANK[a.severity] - RANK[b.severity])
log(`확정 지적 ${confirmed.length}건 (critical ${confirmed.filter((f) => f.severity === 'critical').length}, high ${confirmed.filter((f) => f.severity === 'high').length})`)

// 4) 수정 -------------------------------------------------------------------
let fixes = []
let retest = null
// 검증 에이전트 실패로 '미검증 보존'된 지적(verifyNote 에 ⚠)은 오탐 가능성이 있어 자동 코드수정 대상에서 제외한다
// (미해결 집계에는 그대로 남아 unresolved 로 노출 — 조용히 버리지 않음).
const toFix = doFix ? confirmed.filter((f) => f.severity !== 'low' && !(f.verifyNote && String(f.verifyNote).includes('⚠'))) : []
if (toFix.length) {
  phase('수정')
  const normPath = (p) => { const out = []; for (const s of String(p || '').replace(/\\/g, '/').split('/')) { if (s === '' || s === '.') continue; if (s === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else out.push('..') } else out.push(s) } return out.join('/') }  // 'a/../b'·'./a'·'//'·역슬래시 실제 해소(병렬 수정 충돌 방지)
  const byFile = Object.create(null)  // 정규화 경로로 키(프로토타입 오염 방지 위해 Object.create(null))
  toFix.forEach((f) => { const k = normPath(f.file); (byFile[k] = byFile[k] || []).push(f) })
  fixes = (await parallel(Object.keys(byFile).map((file) => () => {
    // 지적마다 번호 n 을 부여해 넘기고 그 번호로 되받는다 — 에이전트가 title 을 바꿔 적어도 수정 완료 매칭이 어긋나지 않도록.
    const items = byFile[file].map((f, i) => Object.assign({ n: i + 1 }, f))
    return agent(
      `파일 ${file} 의 다음 확정 지적을 고쳐라(설계서 ${design} 의 의도 유지, 이 파일 위주로 수정 — 다른 파일도 병렬 수정 중):\n${JSON.stringify(items)}\n` +
        'git commit 하지 마라. 각 지적을 n(위 번호 그대로)·fixed(true/false)·note(무엇을 했는지)로 반환하라.',
      {
        schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['n', 'fixed'], properties: { n: { type: 'integer' }, fixed: { type: 'boolean' }, note: { type: 'string' } } } } } },
        phase: '수정', label: `수정:${file.split('/').pop()}`,
      },
    ).then((r) => {
      const byN = {}
      if (r && Array.isArray(r.items)) for (const it of r.items) if (it && typeof it.n === 'number') byN[it.n] = it
      return items.map((f) => ({ file: f.file, line: f.line, title: f.title, fixed: !!(byN[f.n] && byN[f.n].fixed), note: byN[f.n] ? (byN[f.n].note || '') : '에이전트 미응답' }))
    })
  }))).filter(Boolean).flat()
  retest = await agent(
    `리뷰 수정 후 빌드와 테스트를 실행하라. 명령 후보: ${A.testCmd || '(분석서의 빌드·테스트 방법)'}. 실패하면 원인만 진단해 반환하라(수정하지 마라).`,
    { schema: { type: 'object', required: ['passed'], properties: { passed: { type: 'boolean' }, summary: { type: 'string' } } }, model: 'sonnet', phase: '수정', label: '재테스트' },
  )
}

// 5) 기록 -------------------------------------------------------------------
phase('기록')
// dedup 키(file:line:title, 경로정규화)와 '동일 규칙'으로 매칭한다 — line 을 빼면 같은 파일·제목·다른 line
// 2건 중 1건만 고쳐도 둘 다 fixed 로 과소집계되어 unresolvedHigh=0 거짓 PASS → deliver 거짓 completed 로 전파되던 결함.
const _fk = (x) => `${_nf(x.file)}:${x.line || 0}:${String(x.title || '')}`
const fixedKeys = new Set(fixes.filter((x) => x.fixed).map(_fk))
const unresolved = confirmed.filter((f) => f.severity !== 'low' && !fixedKeys.has(_fk(f)))
await agent(
  `다음 리뷰 결과로 ${OUT} 를 한국어 마크다운으로 작성하라. 이미 파일이 있으면 새 회차 절을 덧붙여라. ` +
    '구성: 요약(차원별·심각도별 건수, 수정/미해결, 재테스트 결과), 확정 지적 표(심각도·차원·위치·내용·조치), 미해결 목록과 권고, low 지적 목록.\n' +
    JSON.stringify({ base: base, files: files, confirmed: confirmed, fixes: fixes, retest: retest }),
  { model: 'sonnet', phase: '기록', label: '리뷰 기록', effort: 'low' },
)

return {
  phase: 'review',
  path: OUT,
  confirmed: confirmed.length,
  bySeverity: ['critical', 'high', 'medium', 'low'].reduce((o, s) => { o[s] = confirmed.filter((f) => f.severity === s).length; return o }, {}),
  fixed: fixes.filter((x) => x.fixed).length,
  unresolved: unresolved.map((f) => ({ severity: f.severity, file: f.file, line: f.line, title: f.title })),
  unresolvedHigh: unresolved.filter((f) => f.severity === 'critical' || f.severity === 'high').length + laneFailures.length + ((retest && retest.passed === false) || (toFix.length > 0 && !retest) ? 1 : 0),  // 재테스트 null(에이전트 실패)도 수정 시도가 있었으면 '미검증'으로 가산
  laneFailures: laneFailures,
  testsPass: retest ? !!retest.passed : null,
}
