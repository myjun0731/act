# 출처 (Attribution)

sdlc의 워크플로·`pipeline` 스킬은 act 자체 저작물이다. 아래 스킬만 ECC(https://github.com/affaan-m/ECC, MIT License,
© 2026 Affaan Mustafa) 커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 내재화했다. 원본 라이선스는 THIRD_PARTY_NOTICES.md.

## ECC 내재화 W3 (0.5.0)
- production-audit — origin `community`. 변경: 관련 스킬 `tdd-workflow`·`verification-loop` → `test-driven-development`·`verification-before-completion`(dev-toolkit).
- search-first — 원본 그대로.

## ECC 내재화 W4 (0.5.0에 포함)
- orch-pipeline, orch-add-feature, orch-change-feature, orch-fix-defect, orch-refine-code, orch-build-mvp — ECC의 Research→Plan→TDD→Review→Commit 엔진을 act sdlc 단계(analyze·design·implement·test·review·report)에 매핑해 다시 썼다. ECC 에이전트·커맨드(planner·tdd-guide·gan-*·`/build-fix`·`/gan-build` 등)는 dev-toolkit 에이전트, `test-driven-development`, agentic `gan-style-harness`(있으면)로 바꿨다. act는 자동 커밋하지 않으므로 Commit 단계는 `sdlc:report`+게이트로 바꿨다.
- brownfield-retrospective, story-lifecycle(+ `scripts/ledger.js`), issue-review(`/sdlc:issue-review`), growth-log(delivery-gate 훅 섹션 삭제), module-governance, docs-governance(+ scripts 3), product-capability, context-and-decisions, opensource-pipeline.
- **context-and-decisions**: Matt Pocock의 domain-modeling 스킬(https://github.com/mattpocock/skills @ `c55ee460`, MIT, © 2026 Matt Pocock)을 ECC가 각색한 것. 원 LICENSE와 `references/source.md`를 그대로 둔다.
- **product-capability**: ECC 저장소 `docs/examples/`에만 있던 템플릿을 `templates/product-capability-template.md`로 함께 넣었다(ECC, MIT).
- **opensource-pipeline**: ECC 에이전트 `opensource-forker`·`opensource-sanitizer`·`opensource-packager`(ECC@`4adeee6`, MIT)의 본문을 `references/{forker,sanitizer,packager}-protocol.md`로 가져왔다. act에는 이 에이전트가 없어 각 단계를 `general-purpose` 서브에이전트로 돌리고, 프롬프트가 해당 프로토콜 파일을 먼저 읽게 했다. 에이전트 frontmatter(tools·model)는 뺐다.
- 스크립트: docs-governance `audit-docs.py` — 감사 대상 저장소의 git 설정이 헬퍼를 실행하지 못하게 `-c core.fsmonitor=false --no-pager`, 한국어 Windows 콘솔에서 죽던 출력 인코딩을 `errors="replace"`로. story-lifecycle `ledger.js` — 변경 없음(argv 실행·O_EXCL/O_NOFOLLOW).
- 그 외 공통: `tdd-workflow`·`verification-loop` → dev-toolkit 이름, ECC 전용 스킬(project-flow-ops·unified-memory·github-ops 등)·커맨드(`/epic-*`·`/plan-prd`·`/save-session`) 참조 삭제, 공식 플러그인 이름은 "설치돼 있으면"으로.
