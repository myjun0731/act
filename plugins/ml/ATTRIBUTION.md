# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W3, 0.1.0)

- pytorch-patterns, ml-adoption-playbook, recsys-pipeline-architect, bengali-nlp
- 원 기여자: recsys-pipeline-architect — origin `community`, 원본 https://github.com/mturac/recsys-pipeline-architect. xAI For You 알고리즘(Apache-2.0)의 패턴을 독립 재구현한 것으로 원 코드를 포함하지 않는다고 스킬에 명시돼 있다.

### 변경한 내용
- ml-adoption-playbook: `mle-workflow`(W4 예정) 참조를 일반 지시("Production ML workflow")로, 최상위 `origin:` → `metadata.origin`.
- bengali-nlp: 관련 목록에서 `prompt-optimizer`(ECC 종속, 제외) 삭제.

## W4 추가 (0.1.0에 포함)
- mle-workflow — ECC 설치 프로필·"ECC SWE workflows" 표현 삭제, ECC 에이전트(`mle-reviewer`·`performance-optimizer`)는 일반 지시로, 공식 플러그인 에이전트는 "설치돼 있으면", act에 없는 스킬(repo-scan·github-ops·strategic-compact 등)은 act 스킬(codebase-onboarding·git-workflow)로 바꾸거나 삭제, `tdd-workflow`·`verification-loop` → dev-toolkit 이름.
