export const meta = {
  name: 'onboard-pack',
  description: '모듈 온보딩 팩(읽기 전용): codebase-map·sql-db-audit 워크플로를 실행해 구조 맵과 DB 품질을 하나의 온보딩 문서로 합성한다',
  whenToUse: '모듈/레포에 처음 투입되는 사람을 위한 온보딩 자료를 만들 때. 입력(args)으로 경로·모듈을 각 리프에 넘긴다. 설치 규모 large 권장.',
  phases: [
    { title: '수집', detail: '구조 맵·DB 품질 리프 실행' },
    { title: '구성', detail: '온보딩 팩 합성' },
  ],
}

async function runLeaf(name, a) {
  try {
    const r = await workflow(`dev-toolkit:${name}`, a)
    return { name: name, ok: true, result: r }
  } catch (e) {
    return { name: name, ok: false, result: String((e && e.message) ? e.message : e) }
  }
}

phase('수집')
const LEAVES = ['codebase-map', 'sql-db-audit']
const results = []
for (const n of LEAVES) {
  log(`▶ ${n} 실행`)
  results.push(await runLeaf(n, args))
}

phase('구성')
const pack = await agent(
  '다음은 구조 맵(codebase-map)과 DB 품질 감사(sql-db-audit) 워크플로의 결과(JSON)다. 종합해 한국어 마크다운 "온보딩 팩"을 작성하라. ' +
    '구성: ① 아키텍처 개요(계층·데이터 흐름), ② 영역별 책임·진입점, ③ DB/매퍼 주의점(감사 핵심), ' +
    '④ 처음 시작하기(어디부터 읽을지·무엇을 조심할지). ok=false 인 리프는 "미실행"으로 표시하라.\n\n' +
    JSON.stringify(results),
  { label: '온보딩 팩' },
)
return pack
