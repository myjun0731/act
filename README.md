# ACT — Agentic Claude Toolkit

개인이 만들어 쓰는 Claude Code 플러그인 마켓플레이스(공개). 마켓 이름은 `act`.

```
/plugin install allinone --marketplace myjun0731/act
```

셸에서는 `claude plugin install allinone --marketplace https://github.com/myjun0731/act.git`

새 PC라면 먼저 공식 마켓플레이스가 등록돼 있어야 한다. `claude`를 대화형으로 한 번 실행하면 자동으로 등록되고, 바로 셸에서 설치하려면 아래를 먼저 실행한다.

```
claude plugin marketplace add anthropics/claude-plugins-official
```

이게 없으면 공식 플러그인이 설치되지 않고 allinone이 로드되지 않는다.

나중에 allinone에 의존성이 추가되면 업데이트만으로는 새 플러그인이 설치되지 않는다. 그때는 `claude plugin install <새 플러그인>@act`로 따로 설치한다.

## 채널/대상별 설치

채널 4개(개발자 베타 → 공개 베타 → RC → 정식)를 git 브랜치로 운영한다. 설치할 때 `#<ref>`로 채널을 고른다.

| 대상 | 명령 | 채널 |
|---|---|---|
| 일반/안정 | `claude plugin marketplace add myjun0731/act` | 정식(main) |
| 공개 베타 | `claude plugin marketplace add myjun0731/act#beta` | 공개 베타 |
| RC 검증 | `claude plugin marketplace add myjun0731/act#rc` | RC |
| 최신 개발본(불안정) | `claude plugin marketplace add myjun0731/act#dev` | 개발자 베타 |
| 특정 버전 고정 | `claude plugin marketplace add myjun0731/act#v2.0.0` | 그 버전 |

- `#<ref>`를 빼면 기본 브랜치 `main`, 즉 정식을 따라간다. 베타를 받으려면 `#beta`를 명시한다.
- 브랜치 ref(`#beta` 등)는 그 채널의 새 버전을 계속 따라가고, 태그 ref(`#v2.0.0` 등)는 그 버전에 고정된다. 버전 목록은 [Releases](https://github.com/myjun0731/act/releases)에 있다.
- 채널 전환: `claude plugin marketplace remove act` 후 다른 ref로 다시 추가한다. 한 PC에서는 채널 하나만 쓸 수 있다.

## 채널별 안정성

| 채널 | 브랜치 | 버전 예 | 안정성 |
|---|---|---|---|
| 정식 | `main` | `2.0.0` | 릴리스된 상태만 |
| RC | `rc` | `2.0.0-rc.1` | 정식 직전 검증본 |
| 공개 베타 | `beta` | `2.0.0-beta.1` | 안정화 중 |
| 개발자 베타 | `dev` | `2.0.0-dev.1` | 작업 중인 최신본, 깨질 수 있음 |

버전별 변경 내용은 [CHANGELOG.md](CHANGELOG.md)에 있다.

## 플러그인

| 플러그인 | 상태 | 내용 |
|---|---|---|
| allinone | 0.5.1 | 메타 플러그인: core·dev-toolkit·sdlc·design-eng·agentic·overkill·recursive-research + 공식 플러그인 8종 |
| dev-toolkit | 0.10.6 | Java·Spring·DB·레거시·설계·협업·디버깅·TDD·PICT·MCP 스킬 48, 동적 워크플로 11, 리뷰·구현 에이전트 16, 커버리지 커맨드, 규칙 원본 |
| core | 0.5.0 | 비밀파일 가드·prettier 훅, 상태줄, /remember·/recall, /core:setup, 설정 정리·스킬 점검 스킬 4 |
| sdlc | 0.4.1 | 분석→설계→구현→테스트→리뷰→보고서 동적 워크플로 7 + 진행 스킬(`/sdlc:pipeline`). 분석·설계는 사용자 지정 품질까지 반복, 이후 자동 연계. review는 2계층(제네릭+유형별 전문 리뷰어+보안 상시 레인), dev-toolkit 전문 에이전트·스킬 재사용(의존, 미설치 시 제네릭 폴백). 토큰 모델 라우팅(judges·리뷰어·verify→sonnet, 기계→haiku) |
| agentic | 0.3.0 | 에이전트 아키텍처·루프·파이프라인·보안 설계 스킬 12 (외부 원본 내재화, MIT) |
| design-eng | 0.1.2 | 디자인·애니메이션 스킬 7종, design-for-ai(외부 원본) 의존성 |
| overkill · recursive-research | 외부 | 원본 저장소를 커밋 고정으로 가리킴 (MIT) |
| obsidian | 0.1.3 | Obsidian MCP (API 키는 설치 시 입력, allinone 미포함) |

## 메인테이너

릴리스·채널 승격·태그 규칙은 [RELEASE.md](RELEASE.md)에 있다.
