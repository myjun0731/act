# mobile

모바일 스킬: Android/KMP·Compose·Flutter/Dart·SwiftUI·Swift 동시성·iOS 온디바이스 모델. ECC(MIT) 내재화.


```
claude plugin install mobile@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install mobile@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin mobile`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (12)

| 스킬 | 설명 |
|---|---|
| `android-clean-architecture` | Clean Architecture patterns for Android and Kotlin Multiplatform projects — module structure, dependency rules, UseCases, Repositories, and data laye… |
| `compose-multiplatform-patterns` | Compose Multiplatform and Jetpack Compose patterns for KMP projects — state management, navigation, theming, performance, and platform-specific UI. |
| `dart-flutter-patterns` | Production-ready Dart and Flutter patterns covering null safety, immutable state with Freezed, async composition, widget architecture, state manageme… |
| `flutter-dart-code-review` | Library-agnostic Flutter/Dart code review checklist covering widget best practices, state management patterns (BLoC, Riverpod, Provider, GetX, MobX, … |
| `foundation-models-on-device` | Apple FoundationModels framework for on-device LLM — text generation, guided generation with @Generable, tool calling, and snapshot streaming in iOS … |
| `ios-icon-gen` | Generate iOS app icons as PNG imagesets for Xcode asset catalogs from SF Symbols (5000+ Apple-native) or Iconify API (275k+ open source icons from 20… |
| `kotlin-coroutines-flows` | Kotlin Coroutines and Flow patterns for Android and KMP — structured concurrency, Flow operators, StateFlow, error handling, and testing. |
| `liquid-glass-design` | iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit. |
| `swift-actor-persistence` | Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design. |
| `swift-concurrency-6-2` | Swift 6.2 Approachable Concurrency — single-threaded by default, @concurrent for explicit background offloading, isolated conformances for main actor… |
| `swift-protocol-di-testing` | Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing. |
| `swiftui-patterns` | SwiftUI architecture patterns, state management with @Observable, view composition, navigation, performance optimization, and modern iOS/macOS UI bes… |

### 에이전트 (4)

| 에이전트 | 설명 |
|---|---|
| `mobile:dart-build-resolver` | Dart/Flutter build, analysis, and dependency error resolution specialist. |
| `mobile:flutter-reviewer` | Flutter and Dart code reviewer. |
| `mobile:swift-build-resolver` | Swift/Xcode build, compilation, and dependency error resolution specialist. |
| `mobile:swift-reviewer` | Expert Swift code reviewer specializing in protocol-oriented design, value semantics, ARC memory management, Swift Concurrency, and idiomatic pattern… |
<!-- inventory:end -->
