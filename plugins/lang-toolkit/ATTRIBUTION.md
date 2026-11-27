# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W2, 0.1.0)

- 언어: bun-runtime, cpp-coding-standards, cpp-testing, csharp-testing, dotnet-patterns, fsharp-testing, golang-patterns, golang-testing, kotlin-patterns, kotlin-testing, perl-patterns, perl-security, perl-testing, python-patterns, python-testing, rust-patterns, rust-testing, typescript-patterns, generating-python-installer
- 백엔드 프레임워크: django-celery, django-patterns, django-security, django-tdd, django-verification, fastapi-patterns, kotlin-exposed-patterns, kotlin-ktor-patterns, laravel-patterns, laravel-security, laravel-tdd, laravel-verification, nestjs-patterns, prisma-patterns, quarkus-patterns, quarkus-security, quarkus-tdd, quarkus-verification, rails-patterns, rails-security, tinystruct-patterns

원 기여자가 ECC가 아닌 스킬(ECC 저장소에 기여된 것):
- rails-patterns, rails-security — origin `community`
- generating-python-installer — ECC 기여자 xiaolei (원본에 origin 없음 → `community`로 기록)
- cpp-coding-standards — C++ Core Guidelines(isocpp.github.io) 기반

### 변경한 내용
- laravel-tdd: 관련 스킬 `tdd-workflow`(ECC) → act `test-driven-development`(dev-toolkit).
- typescript-patterns, rails-patterns, rails-security: ECC 규칙 파일(`rules/ecc/...`) 안내를 "프로젝트에 규칙이 있으면 그것을 따른다"로 바꾸고 관련 목록에서 뺐다. act는 해당 규칙을 배포하지 않는다.
- typescript-patterns: `frontend-patterns`를 "web-frontend 플러그인이 있으면 그 프론트엔드 패턴 스킬"로 바꿨다.
- rails-patterns, rails-security: 최상위 `origin:` → `metadata.origin`.
- generating-python-installer: `metadata.origin` 추가.
- 그 외 본문은 원본 그대로.

## W4 추가 (0.1.0에 포함)
- godot-patterns, godot-testing — origin `community`. ECC `gdscript-reviewer`·`tdd-guide` 에이전트 → 일반 리뷰 지시·`test-driven-development`, 최상위 `origin` → `metadata`.
- laravel-plugin-discovery — **LaraPlugins MCP 서버가 필요**하다고 맨 위에 명시하고, MCP가 없을 때 Packagist/GitHub 조사로 대체하도록 했다.
