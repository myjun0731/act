export const meta = {
  name: 'test-coverage-boost',
  description: '테스트 공백 유닛을 찾아 유닛별로 새 테스트 파일을 생성(기존 파일 미수정)하고, 마지막에 빌드를 한 번 돌려 검증한 뒤 결과와 잔여 공백을 보고한다',
  whenToUse: '테스트가 부족한 모듈의 커버리지를 대량으로 보강할 때. 입력(args)으로 경로·모듈을 넘기면 그 범위, 없으면 작업 트리의 변경 유닛. ⚠️ 새 테스트 파일을 레포에 생성한다(커밋 전 리뷰 권장).',
  phases: [
    { title: '공백탐색', detail: '테스트 없는/부족한 유닛 식별' },
    { title: '생성', detail: '유닛별 새 테스트 파일 생성(기존 미수정)' },
    { title: '검증', detail: '빌드·테스트를 한 번 실행' },
    { title: '보고', detail: '생성 결과·빌드·잔여 공백 보고' },
  ],
}

const GAPS_SCHEMA = {
  type: 'object',
  required: ['gaps'],
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'unit'],
        properties: {
          path: { type: 'string' },
          unit: { type: 'string' },
          why: { type: 'string' },
        },
      },
    },
  },
}

const GEN_SCHEMA = {
  type: 'object',
  required: ['unit', 'wrote'],
  properties: {
    unit: { type: 'string' },
    testFile: { type: 'string' },
    wrote: { type: 'boolean' },
    summary: { type: 'string' },
  },
}

const target = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.target) ? String(args.target).trim() : ''

// 1) 공백 탐색 ------------------------------------------------------------
phase('공백탐색')
const scope = target
  ? `대상: ${target}`
  : '대상: 현재 작업 트리의 변경(git diff HEAD)에 포함된 유닛.'
const found = await agent(
  `${scope}\n테스트가 없거나 부족한 유닛(클래스·메서드·매퍼)을 식별해 gaps로 반환하라(path·unit·why). ` +
    '이미 충분히 테스트된 것은 제외. test-coverage 접근을 참고하라.',
  { schema: GAPS_SCHEMA, effort: 'low', label: '공백 탐색' },
)
const gaps = (found && Array.isArray(found.gaps)) ? found.gaps : []
log(`테스트 공백 ${gaps.length}건`)
if (!gaps.length) return { generated: [], note: '보강할 테스트 공백이 없습니다.' }

// 2) 생성 (유닛별 새 테스트 파일; 빌드는 실행하지 않음) ---------------------
phase('생성')
const generated = (await parallel(
  gaps.map((g) => async () => {
    const out = await agent(
      `유닛 ${g.unit}(${g.path})의 테스트를 작성하라. 규칙: ` +
        '① 기존 파일을 수정하지 말고 이 유닛만을 위한 "새 테스트 파일"을 적절한 경로에 생성한다. ' +
        '② 경계값·대표 조합을 포함하되 과하지 않게. springboot-tdd·test-driven-development·pypict 스킬 지침이 있으면 적용. ' +
        '③ 빌드/테스트는 실행하지 마라(마지막에 한 번만 돌린다). ' +
        'wrote(파일 생성 여부)·testFile(생성 경로)·summary 를 반환하라.',
      { agentType: 'dev-toolkit:test-automator', schema: GEN_SCHEMA, phase: '생성', label: `생성:${g.unit}` },
    )
    return out
  }),
)).filter(Boolean)
const wrote = generated.filter((x) => x && x.wrote)
log(`테스트 파일 ${wrote.length}/${gaps.length} 생성`)

// 3) 검증 (빌드·테스트 1회; 생성 0건이면 건너뜀) --------------------------
phase('검증')
let build = '생성된 새 테스트 파일이 없어 빌드·테스트를 건너뜀.'
if (wrote.length) {
  build = await agent(
    '방금 새 테스트 파일들이 생성되었다. 프로젝트 빌드 도구(Maven/Gradle 등)를 감지해 테스트를 한 번 실행하고 결과를 요약하라: ' +
      '통과/실패 수, 실패한 새 테스트와 원인(컴파일 오류 포함), 조치 제안. java-build-resolver 관점으로.\n' +
      '생성 목록: ' + JSON.stringify(wrote.map((x) => ({ unit: x.unit, testFile: x.testFile }))),
    { agentType: 'dev-toolkit:java-build-resolver', label: '빌드·테스트' },
  )
}

// 4) 보고 -----------------------------------------------------------------
phase('보고')
const report = await agent(
  '다음 자료로 한국어 마크다운 "테스트 보강 보고서"를 작성하라. ' +
    '구성: ① 생성 요약(유닛·파일), ② 빌드·테스트 결과, ③ 실패·후속 조치, ④ 잔여 공백(탐색됐지만 생성 안 된 것)과 재실행 권고.\n\n' +
    '탐색 공백: ' + JSON.stringify(gaps) + '\n생성 결과: ' + JSON.stringify(generated) + '\n빌드 결과:\n' + String(build),
  { label: '보고서' },
)
return report
