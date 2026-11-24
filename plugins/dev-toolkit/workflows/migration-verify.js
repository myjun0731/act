export const meta = {
  name: 'migration-verify',
  description: '이관(버전 업·DB 방언 전환·레거시 현대화) 단위를 수집해 접근/위험·동등성·이관함정·롤백/무중단·테스트공백 차원으로 검증하고, 완전성 보강 1회 뒤 리포트로 합친다',
  whenToUse: '마이그레이션/DDL/엔티티/매퍼 변경이 거동을 보존하고 안전한지(롤백·무중단·테스트 커버) 검증할 때. 입력(args)으로 경로·PR·브랜치를 넘기면 그 범위, 없으면 작업 트리의 이관 관련 변경. 도메인 고유 검증(매퍼 방언 대조·이관함정 스캔·DB 조회)은 도메인 플러그인에서.',
  phases: [
    { title: '수집', detail: '이관 단위(마이그레이션·DDL·엔티티·매퍼) 수집' },
    { title: '검증', detail: '단위별 다차원 검증 + 지적 반박' },
    { title: '완전성', detail: '미점검 위험을 비평가가 찾아 1회 보강' },
    { title: '리포트', detail: '위험·테스트공백·롤백준비를 심각도순 리포트로' },
  ],
}

// dev-toolkit에 함께 설치되는 에이전트(legacy-modernizer, sql-pro, test-automator)를 차원 워커로
// 디스패치하고, 전용 에이전트가 없는 차원(이관함정·롤백/무중단)은 프롬프트에 스킬
// (postgres-patterns·mysql-patterns·database-migration)을 명시해 보강한다. 제네릭 골격이다.

const COLLECT_SCHEMA = {
  type: 'object',
  required: ['units'],
  properties: {
    units: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'kind'],
        properties: {
          path: { type: 'string' },
          kind: { type: 'string', enum: ['migration', 'ddl', 'entity', 'mapper', 'other'] },
        },
      },
    },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'summary'],
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' },
          summary: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real'],
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const GAPS_SCHEMA = {
  type: 'object',
  required: ['gaps'],
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'ask'],
        properties: {
          file: { type: 'string' },
          aspect: { type: 'string' },
          ask: { type: 'string' },
        },
      },
    },
  },
}

const target = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.target) ? String(args.target).trim() : ''

// 지적 1건을 반박 검증해 살아남으면 그 지적을, 아니면 null 을 돌려준다.
async function verify(f) {
  const v = await agent(
    '다음 이관 검증 지적을 반박하라. 재현되지 않거나 근거가 약하면 real=false. 확신이 없으면 real=false로 기운다.\n' +
      `파일: ${f.file}${f.line ? ':' + f.line : ''}\n분류: ${f.category || ''}\n심각도: ${f.severity}\n지적: ${f.summary}\n상세: ${f.detail || ''}`,
    { schema: VERDICT_SCHEMA, phase: '검증', label: `검증:${f.file}` },
  )
  return (v && v.real) ? f : null
}

// 1) 수집 -----------------------------------------------------------------
phase('수집')
const scope = target
  ? `대상: ${target} — 경로/글롭이면 그 안을, PR·브랜치면 그 범위의 변경을 본다.`
  : '대상: 현재 작업 트리의 변경(git diff HEAD) 중 이관 관련 파일.'
const collected = await agent(
  `${scope}\n` +
    '이관(마이그레이션 스크립트·DDL 변경·엔티티 정의·매퍼) 단위를 찾아 나열하고 종류(migration/ddl/entity/mapper/other)로 분류하라. ' +
    '생성물·백업은 제외하라.',
  { schema: COLLECT_SCHEMA, label: '이관 단위 수집' },
)
const units = (collected && Array.isArray(collected.units)) ? collected.units : []
log(`이관 단위 ${units.length}건 수집`)
if (!units.length) return { findings: [], note: '검증할 이관 단위가 없습니다.' }

// 단위별 검증 차원
const DIMENSIONS = [
  {
    key: 'approach_risk',
    agentType: 'dev-toolkit:legacy-modernizer',
    ask: '이관 접근과 위험을 분석하라: 하위호환 파괴·강 결합·단계적(스트랭글러) 적용 여부, 데이터 이행 누락. 안전망(feature flag·호환 어댑터)이 필요한 지점',
  },
  {
    key: 'equivalence',
    agentType: 'dev-toolkit:sql-pro',
    ask: '이관 전후 동등성·정합성을 점검하라: 결과·정렬·NULL 처리·수치 정밀도·데이터 손실/절삭 가능성',
  },
  {
    key: 'dialect_trap',
    ask:
      '이관 함정을 점검하라(예: MariaDB→PostgreSQL): 정수 컬럼 setString, varchar(n) 일시 컬럼 캐스트, ' +
      'LIMIT/OFFSET·문자열/날짜 함수·식별자 대소문자 차이, 시퀀스/자동증가 차이. postgres-patterns·mysql-patterns 스킬 지침이 있으면 적용하라',
  },
  {
    key: 'rollback_safety',
    ask:
      '롤백·무중단 안전성을 점검하라: down/역방향 경로 존재, 순서 의존성, 대형 테이블 잠금·장시간 트랜잭션, ' +
      '다단계(추가→백필→전환→제거) 필요 여부. database-migration 스킬 지침이 있으면 적용하라',
  },
  {
    key: 'test_gap',
    agentType: 'dev-toolkit:test-automator',
    ask: '이관 거동을 증명할 테스트 공백을 찾아라: 전후 동등성·경계값·회귀. 무엇을 추가해야 하는지 구체적으로',
  },
]

// 2) 검증 (파이프라인: 단위별 차원 병렬 → 지적 반박) ----------------------
const perUnit = await pipeline(
  units,
  // 다차원 점검
  async (unit) => {
    const results = await parallel(
      DIMENSIONS.map((d) => async () => {
        const opts = { schema: FINDINGS_SCHEMA, phase: '검증', label: `점검:${d.key}:${unit.path}` }
        if (d.agentType) opts.agentType = d.agentType
        const out = await agent(
          `이관 단위 ${unit.path}(${unit.kind}) 를 다음 관점으로 검증하라: ${d.ask}. ` +
            `발견한 문제만 findings로 반환하고(category에 '${d.key}' 표기), 없으면 빈 배열을 반환하라.`,
          opts,
        )
        return (out && Array.isArray(out.findings)) ? out.findings : []
      }),
    )
    return results.filter(Boolean).flat()
  },
  // 지적 반박
  async (findings) => {
    if (!findings.length) return []
    const checked = await parallel(findings.map((f) => async () => verify(f)))
    return checked.filter(Boolean)
  },
)

let confirmed = perUnit.flat().filter(Boolean)
log(`1차 확인 지적 ${confirmed.length}건`)

// 3) 완전성 보강 1회 (completeness critic → 보강 라운드) ------------------
phase('완전성')
const critic = await agent(
  '아래는 이관 단위 목록과 지금까지 확인된 지적(JSON)이다. 아직 점검되지 않은 이관 위험을 찾아 gaps로 반환하라. ' +
    '각 gap은 점검할 file·aspect·ask(무엇을 어떻게 볼지)를 담는다. 충분히 점검됐으면 빈 배열을 반환하라. 최대 6개.\n\n' +
    '단위: ' + JSON.stringify(units) + '\n확인 지적: ' + JSON.stringify(confirmed),
  { schema: GAPS_SCHEMA, label: '완전성 비평' },
)
const gaps = (critic && Array.isArray(critic.gaps)) ? critic.gaps.slice(0, 6) : []
if (gaps.length) {
  log(`미점검 위험 ${gaps.length}건 보강`)
  const extra = await parallel(
    gaps.map((g) => async () => {
      const out = await agent(
        `이관 위험 보강 점검 — 파일 ${g.file}${g.aspect ? ' / ' + g.aspect : ''}: ${g.ask}. ` +
          "발견한 문제만 findings로 반환하고(category에 'gap' 표기), 없으면 빈 배열.",
        { schema: FINDINGS_SCHEMA, phase: '완전성', label: `보강:${g.file}` },
      )
      const fs = (out && Array.isArray(out.findings)) ? out.findings : []
      const checked = await parallel(fs.map((f) => async () => verify(f)))
      return checked.filter(Boolean)
    }),
  )
  confirmed = confirmed.concat(extra.filter(Boolean).flat())
} else {
  log('완전성 보강: 추가 위험 없음')
}
log(`최종 확인 지적 ${confirmed.length}건`)

// 4) 리포트 ---------------------------------------------------------------
phase('리포트')
const report = await agent(
  '다음은 이관 검증에서 확인된 지적 목록(JSON)이다. 한국어 마크다운 이관 검증 리포트를 작성하라. 구성: ' +
    '① 위험 요약(심각도 high→low, 차원별), ② 롤백·무중단 준비 상태, ③ 테스트 공백과 추가 권고, ④ 단위별 상세(`파일:라인`·분류·요약·권고). ' +
    '지적이 없으면 통과(PASS)임을 명시하라.\n\n' +
    JSON.stringify(confirmed),
  { label: '리포트 작성' },
)
return report
