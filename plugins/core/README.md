# core

여러 마켓플레이스가 함께 쓸 수 있는 공통 기반 플러그인. 원본은 이 저장소에 둔다.

## 들어 있는 것
| 종류 | 이름 | 하는 일 |
|---|---|---|
| 훅 | guard_secrets (PreToolUse) | `.pem`·`.key`·`credentials`·`secrets.json` 같은 비밀/키 파일 쓰기를 막는다 |
| 훅 | format_on_edit (PostToolUse) | 프로젝트에 prettier 설정이 있을 때만 편집한 파일을 포맷한다 |
| 훅 | session_check (SessionStart) | 초기 설정이 안 됐거나 core가 새 버전이면 `/core:setup`을 권하게 한다. 같은 이름의 플러그인이 여러 마켓플레이스에서 켜져 있으면 알린다. 상태줄 스크립트를 최신본으로 맞춘다 |
| 스킬 | `/core:setup` | 권한 허용목록·상태줄·env·규칙 파일과 같은 마켓플레이스 플러그인의 `settings-payload/*.json`을 `~/.claude`에 병합하고 자동 업데이트를 켠다 |
| 커맨드 | `/core:remember`, `/core:recall` | 장기 메모리 저장·조회 |
| 스킬 | config-gc | `~/.claude`의 안 쓰는 스킬·훅·권한·MCP를 찾아 항목마다 확인받고 `_gc_trash/`로 옮김 (ECC) |
| 스킬 | skill-stocktake | 스킬·커맨드 품질 점검. Bash·Node·`jq` 필요. `~/.claude/skills`와 프로젝트 스킬만 훑고 플러그인 스킬은 대상이 아님 (ECC) |
| 스킬 | skill-scout | 새 스킬을 만들기 전에 비슷한 기존 스킬을 찾음 (ECC) |
| 스킬 | mcp-dependency-review | MCP 설정의 버전 미고정 패키지 참조를 실행 없이 검사 (ECC) |

## 설치
```
/plugin install core --marketplace myjun0731/claude-pro
```
설치한 뒤 `/core:setup`을 한 번 실행한다. 미리보기를 먼저 보여 주고, 동의해야 적용한다.

## 출처
ECC에서 가져온 스킬 4개의 커밋·변경점·라이선스는 `THIRD_PARTY_NOTICES.md`에 있다.

## 필요한 것
- Python 3 (`python` 명령). 훅과 상태줄이 Python 스크립트다.
- prettier 포맷은 Node/npx와 프로젝트의 prettier 설치가 있을 때만 동작한다. 없으면 아무것도 하지 않는다.

## setup이 건드리는 곳
- `~/.claude/settings.json`: `env`, `permissions.allow`(합집합), `statusLine`, `extraKnownMarketplaces.<이름>.autoUpdate`. 고치기 전에 `settings.json.bak-core-<시각>`으로 백업한다.
- `~/.claude/managed/core/`: 상태줄 스크립트, 적용 버전 기록
- `~/.claude/rules/<플러그인>/`: 같은 마켓플레이스 플러그인의 `rules-payload/` 사본
- `~/.claude/settings.json`: 같은 마켓플레이스와 `settings/base.json`의 `payloadMarketplaces`에 적힌 마켓플레이스(기본 없음)에서 **사용자 범위로 설치된** 플러그인의 `settings-payload/*.json`을 합침 (`_`로 시작하는 키는 설명용이라 무시). 그 밖의 마켓플레이스는 권한까지 바꿀 수 있어 받아들이지 않는다
