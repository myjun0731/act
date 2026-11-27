# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W3, 0.1.0)

- android-clean-architecture, compose-multiplatform-patterns, kotlin-coroutines-flows, dart-flutter-patterns, flutter-dart-code-review,
  swiftui-patterns, swift-actor-persistence, swift-concurrency-6-2, swift-protocol-di-testing, liquid-glass-design, foundation-models-on-device, ios-icon-gen(+ scripts)
- 원 기여자: ios-icon-gen — origin `community`.
- **ios-icon-gen 스크립트는 네트워크를 쓴다**: `scripts/iconify_gen.sh`가 https://api.iconify.design 에서 SVG를 내려받는다(macOS `sips` 변환). `generate_icons.swift`는 로컬 SF Symbols만 쓴다.

### 변경한 내용
- dart-flutter-patterns: ECC 규칙 파일(`rules/dart/`) 안내 삭제.
