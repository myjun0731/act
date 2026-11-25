export const meta = {
  name: 'report',
  description: 'SDLC 완료 단계: 분석·설계·구현·테스트·리뷰 산출물과 품질 이력을 모아 요구 추적 매트릭스가 포함된 최종 보고서(REPORT.md)를 작성한다',
  whenToUse: '/sdlc:pipeline 의 마지막 단계(Claude 자동 호출). args: { dir, baseRef, outcome, history }. outcome/history 는 앞 단계 결과 요약(선택).',
  phases: [{ title: '보고서', detail: 'REPORT.md 작성' }],
}

const A = (args && typeof args === 'object') ? args : {}
const dir = String(A.dir || '.sdlc/current').replace(/\/+$/, '')
const OUT = `${dir}/REPORT.md`
const base = A.baseRef ? String(A.baseRef) : 'HEAD'

phase('보고서')
const md = await agent(
  `${dir}/ 아래 산출물(01-analysis.md, 02-design.md, 03-implementation.md, 04-test.md, 05-review.md, state.json 이 있으면)을 모두 읽고, ` +
    `git diff --stat ${base} 와 신규 파일 목록으로 실제 변경 규모를 확인한 뒤, 최종 보고서를 한국어 마크다운으로 ${OUT} 에 작성하라.\n` +
    '구성(이 순서):\n' +
    '# 완료 보고서\n## 1. 결과 요약 — 최종 상태(완료/부분 완료/차단), 한 문단 요약, 핵심 수치(요구 수·작업 수·테스트 통과·리뷰 지적)\n' +
    '## 2. 단계별 결과 — 분석·설계(최종 점수/목표, 반복 라운드), 구현, 테스트, 리뷰\n' +
    '## 3. 요구 추적 매트릭스 — REQ/AC → 설계 요소 → TASK → 변경 파일 → TC → 결과(통과/실패/미검증)\n' +
    '## 4. 변경 내역 — 파일별 변경 요약(diff stat 근거)\n' +
    '## 5. 설계 이탈·결정 사항\n## 6. 남은 위험·미해결 항목\n## 7. 후속 조치 권고(커밋·PR·배포 전 확인 포함)\n' +
    '문서에 없는 사실을 지어내지 말고, 확인 못 한 항목은 "미확인"으로 표시하라. 코드는 수정하지 마라. 작성한 보고서 본문을 그대로 반환하라.\n\n' +
    `파이프라인 결과 요약(JSON): ${JSON.stringify({ outcome: A.outcome || null, history: A.history || null })}`,
  { phase: '보고서', label: 'REPORT.md' },
)
return { phase: 'report', path: OUT, report: md }
