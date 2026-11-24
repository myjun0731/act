# CHANGELOG

릴리스마다 `## [마켓플레이스 버전] - 날짜` 섹션을 하나씩 추가한다. `scripts/release.py`는 이 섹션이 없으면 태그를 만들지 않는다.

## [1.4.0] - 2026-11-24

새 플러그인 `agentic` 0.1.0 추가. ECC(MIT, github.com/affaan-m/ECC)에서 에이전트 엔지니어링 스킬 3개를 선별 내재화.
- `agent-security-hardening` — untrusted content 처리 에이전트 런타임 보안 하드닝
- `agent-architecture-audit` — 12층 에이전트 스택 진단(출처 oh-my-agent-check)
- `benchmark-optimization-loop` — 측정 기반 개선 루프(정확도·속도·비용)
- 출처·라이선스는 각 SKILL.md frontmatter와 `plugins/agentic/ATTRIBUTION.md`에 보존.
- `allinone` 0.3.2 → 0.4.0: 의존성에 `agentic` 추가.

## [1.3.0] - 2026-11-23

파괴적 변경. 마켓플레이스 이름을 `myoun-pro` 에서 `claude-pro` 로 바꿨다 (레포명과 일치).
- 설치 명령이 `@myoun-pro` 에서 `@claude-pro` 로 바뀐다. 소스 경로(`myjun0731/claude-pro`)는 그대로.
- 기존에 `@myoun-pro` 로 설치·등록한 사람은 마켓을 재등록한다.
  ```
  claude plugin marketplace remove myoun-pro
  claude plugin marketplace add myjun0731/claude-pro
  ```
  그 뒤 `claude plugin install <플러그인>@claude-pro` 로 다시 설치.
- 이름 변경으로 README가 바뀐 `allinone`, `obsidian` 플러그인 버전을 각각 0.3.2, 0.1.2 로 올림.

## [1.2.0] - 2026-11-22

core 0.4.0
- `/core:setup`이 다른 마켓플레이스의 settings·rules 조각도 받을 수 있게 했다. 단 `settings/base.json`의 `payloadMarketplaces`에 적힌 곳만. 여러 마켓플레이스를 함께 쓰는 PC에서 다른 마켓의 autoMode 정책이 적용되지 않던 문제를 고쳤다.
- 조각은 사용자 범위로 설치된 플러그인에서만 가져온다. 다른 프로젝트에 local 범위로 깐 플러그인은 무시한다.

## [1.1.0] - 2026-11-22

core 0.3.0
- `/core:setup`: 같은 마켓플레이스 플러그인의 `settings-payload/*.json`을 settings.json에 합친다. dict는 재귀로, list는 합집합으로 합치고 `_`로 시작하는 키는 무시한다. 조직 마켓플레이스의 autoMode 정책 같은 설정을 플러그인으로 나눠 줄 때 쓴다.
- 세션 시작 점검: 같은 이름의 플러그인이 여러 마켓플레이스에서 동시에 켜져 있으면 알린다 (예: `core@claude-pro`와 `core@<다른 마켓>`).

## [1.0.1] - 2026-11-22

내용 변경 없음. 표기만 정리했다.
- 작성자 표기에서 소속 약칭을 뺐다 (marketplace.json, 플러그인 5개).
- dev-toolkit `THIRD_PARTY_NOTICES.md`에서 특정 플러그인 이름이 나오는 설명 한 줄을 지웠다.
- 플러그인 버전: allinone 0.3.1, core 0.2.1, design-eng 0.1.1, dev-toolkit 0.4.1, obsidian 0.1.1

## [1.0.0] - 2026-11-22

첫 릴리스.

| 플러그인 | 버전 | 내용 |
|---|---|---|
| allinone | 0.3.0 | 메타 플러그인. 아래 내 플러그인 5개와 공식 플러그인 8개를 함께 설치 |
| core | 0.2.0 | 비밀파일 가드·prettier 훅, 상태줄, `/core:setup`, 메모리 커맨드, 설정 정리·스킬 점검 스킬 4개 |
| dev-toolkit | 0.4.0 | Java·Spring·DB·레거시·설계·디버깅·TDD·PICT·MCP 스킬 28개, 테스트 커버리지 커맨드, 리뷰 에이전트 3개, Java 규칙 원본 |
| design-eng | 0.1.0 | 디자인·애니메이션 스킬 7개 (+ design-for-ai) |
| obsidian | 0.1.0 | Obsidian MCP 서버 (allinone 미포함) |

외부 원본(커밋 고정): design-for-ai `37d7ae6`, overkill `60c7bbb`, recursive-research `15ed326`
