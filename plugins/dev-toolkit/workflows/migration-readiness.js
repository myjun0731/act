export const meta = {
  name: 'migration-readiness',
  description: '이관 준비도 평가(읽기 전용): migration-verify·impact-analysis·db-diff 워크플로를 순차 실행해 하나의 준비도 리포트로 합성한다',
  whenToUse: '이관(버전 업·DB 방언 전환·레거시 현대화)을 진행하기 전 준비도 점검. 입력(args)으로 경로·PR·브랜치를 각 리프에 넘긴다. DB 구조 차이(db-diff)까지 보려면 복합 args로 DB 스냅샷(targets)을 함께 넘긴다 — 없으면 db-diff는 "스냅샷 필요"로 안내만 하고 넘어간다. 테스트 공백은 migration-verify가 보고하며, 실제 테스트 생성(파일 생성)은 test-coverage-boost를 따로 실행한다 — 준비도 평가는 읽기 전용으로 둔다. 설치 규모 large 권장.',
  phases: [
    { title: '평가', detail: '이관검증·영향분석 리프 실행' },
    { title: '준비도', detail: '준비도 리포트 합성' },
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

phase('평가')
const LEAVES = ['migration-verify', 'impact-analysis', 'db-diff']
const results = []
for (const n of LEAVES) {
  log(`▶ ${n} 실행`)
  results.push(await runLeaf(n, args))
}

phase('준비도')
const report = await agent(
  '다음은 이관 검증·영향 분석·DB 구조 diff 워크플로의 결과(JSON)다. 종합해 한국어 마크다운 "이관 준비도 리포트"를 작성하라. ' +
    '구성: ① 준비도 신호(준비됨 / 주의 / 미흡)와 근거, ② 이관 위험(migration-verify: 접근·동등성·이관함정·롤백), ' +
    '③ 변경 영향·회귀 범위(impact-analysis), ④ DB 구조 차이(db-diff: 스키마·방언·프로파일; 스냅샷 미제공이면 "스냅샷 필요"로 표시), ' +
    '⑤ 착수 전 선결 과제, ⑥ 테스트 공백 요약과 `test-coverage-boost` 실행 권고(이 평가는 파일을 만들지 않는다). ' +
    'ok=false 인 검사는 "미실행"으로 표시하라.\n\n' +
    JSON.stringify(results),
  { label: '준비도 리포트' },
)
return report
