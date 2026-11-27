# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W3, 0.1.0)

- accessibility, design-system, frontend-a11y, frontend-patterns, i18n-sync, make-interfaces-feel-better,
  motion-foundations, motion-patterns, motion-advanced, nextjs-turbopack, nuxt4-patterns, ui-to-vue, vite-patterns, vue-patterns, angular-developer(+ references)
- 원 기여자: frontend-a11y, i18n-sync, make-interfaces-feel-better, ui-to-vue — origin `community`. motion-* — author `jeff`.
- **angular-developer**: ECC가 Angular 공식 저장소의 `skills/dev-skills/angular-developer`(https://github.com/angular/angular, MIT, Copyright (c) 2010-2026 Google LLC)를 가져온 것. 원문 라이선스는 THIRD_PARTY_NOTICES.md.

### 변경한 내용
- angular-developer: 관련 스킬 `tdd-workflow` → `test-driven-development`(dev-toolkit).
- vue-patterns: 최상위 `origin:` → `metadata.origin`.
- motion-foundations·motion-patterns·motion-advanced: 최상위 `tags`·`category`·`author` → `metadata` 아래로, `metadata.origin: ECC` 추가.
