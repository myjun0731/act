# ECC → act 내재화 — 결정과 진행

ECC(`affaan-m/ECC`, MIT)의 IT/SW 스킬 중 act에 없는 것을, ECC 하네스 없이 독립 동작하도록 고쳐 act에 넣는다.

- 기준: ECC `4adeee6732a12d1540f49a4d50a38ce8c97f9a53` · act `dev` @ `2df40c5`
- 스킬별 분류: [tier-map.json](tier-map.json) — `tier`·`plugin`(대상)·`ecc_deps`(풀어야 할 ECC 참조)·`origin`/`license`

## 결정 (2026-11-27)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 범위 | **Tier A·B만.** Tier C 41개는 제외하고 tier-map에 목록만 남긴다 |
| 2 | 플러그인 체계 | **도메인별 신규 플러그인**: lang-toolkit · web-frontend · mobile · infra-devops · data-db · web3 · ml · security · media-docs. 에이전트·프로세스 계열은 기존 agentic · sdlc · dev-toolkit을 확장 |
| 3 | 배포 | **opt-in.** allinone `dependencies`에 추가하지 않는다. 신규 플러그인은 스킬이 들어오는 웨이브에 마켓플레이스에 등록한다 |
| 4 | 업스트림 | **`4adeee6` 고정 포크 + 분기별 수동 재대조.** `scripts/gen_ecc_refs.py`로 새 커밋의 이름 목록을 만들고 `check_skills.py`로 다시 본다. NOTICE에는 40자 전체 SHA로 적는다 |
| 5 | healthcare 4개 + hipaa-compliance | **제외** (tier `D`) |
| 6 | orch-* 6개 | **포팅** (sdlc). ECC 에이전트·커맨드 참조는 act sdlc 워크플로로 다시 쓴다 |
| 7 | deep-research | **리네임 후 포팅**(W5, 후보 `web-research-mcp`). firecrawl·exa MCP는 선택 기능으로 격리 |
| 8 | 프론트매터 정규화 기준 | **act 자체 린트** `scripts/check_skills.py`. skill-host-compat은 일반 B 스킬로 취급 |

## 수치

| Tier | 뜻 | 개수 |
|---|---|---|
| A | 거의 그대로 포팅 | 116 |
| B | ECC 에이전트·커맨드·MCP 참조를 고쳐 포팅 | 67 |
| C | ECC 런타임 종속 — 제외 | 41 |
| D | 결정으로 제외 | 5 |
| X / EQ | 비-IT / act에 동등 스킬 있음 | 43 / 3 |

EQ: `tdd-workflow`→test-driven-development, `verification-loop`→verification-before-completion, `mcp-server-patterns`→mcp-builder. 포팅하는 스킬 안의 이 이름 참조는 act 이름으로 바꾼다.

## 웨이브

| 웨이브 | 내용 | 개수 | 상태 |
|---|---|---|---|
| W2-0 | `check_skills.py` 게이트 + 신규 플러그인 9개 스캐폴드 | — | 완료 |
| W2 | A: lang-toolkit 40 · security 5 · dev-toolkit 6 · data-db 2 | 53 | 완료 |
| W3 | A: web-frontend 15 · mobile 12 · infra-devops 11 · web3 5 · ml 4 · media-docs 3 · sdlc 2 · agentic 10 + B 네트워크 3(앞당김) | 65 | 완료 (remotion-video-creation 보류) |
| W4 | B: agentic 21 · sdlc 15 (orch-* 포함) · web-frontend 8 · lang-toolkit 3 · infra-devops 1 · ml 1 | 49 | |
| W5 | B: MCP/API 의존 — dev-toolkit 8 (deep-research 리네임) · media-docs 6 · security 1 | 15 | |

허브 스킬은 웨이브 초기에 먼저 넣는다: `security-review`(W2, A/B 13개가 참조), `frontend-patterns`(W3, 14개).

## 스킬 하나 포팅하는 순서

1. ECC `skills/<name>/` 디렉터리를 통째로 대상 플러그인 `skills/`에 복사한다(ECC 체크아웃의 스크립트는 실행하지 않는다).
2. `python scripts/check_skills.py --plugin <plugin>` — ERROR가 남은 참조 목록이다.
3. 참조를 푼다: 같은 웨이브에 들어오는 스킬이면 그대로 두고, EQ면 act 이름으로 바꾸고, C·X·D면 문장을 지우거나 "있으면 적용"으로 바꾼다. ECC 에이전트·커맨드는 act 등가물로 바꾸거나 일반 지시로 풀어 쓴다. 최상위 `origin:` 키는 `metadata.origin`으로 옮긴다.
4. 동봉 스크립트가 있으면 코드 리뷰 후 넣는다(tier-map `scripts`).
5. 플러그인 `ATTRIBUTION.md`에 스킬과 변경 내용을, `origin`이 ECC가 아니면 원 기여자를 적는다.
6. `plugin.json` version·keywords는 웨이브 끝에 한 번 올린다. 그 웨이브에 처음 스킬이 들어온 플러그인은 marketplace.json에 등록한다.
7. 게이트: `check_skills.py` ERROR 0 · `check_refs.py` ERROR 0 · `claude plugin validate plugins/<plugin>`.

## 기존 스킬의 ECC 참조 부채

`check_skills.py`를 처음 돌렸을 때 기존 act 스킬 73개에서 ERROR 55건이 나왔다(W2 후 42건)(`scripts/skillcheck_baseline.json`). 대부분 이전 내재화 때 따라 들어온 ECC 스킬 참조다. 일부는 웨이브가 진행되면 저절로 풀린다(`security-review`·`frontend-patterns`·`coding-standards`·`eval-harness`·`autonomous-loops` 등). C·X를 가리키는 나머지(`configure-ecc`·`nanoclaw`·`workspace-surface-audit`·`continuous-learning` 등)와 `pypict`의 name/디렉터리 불일치는 따로 고쳐야 한다.

## 진행 중 바뀐 것

- **W3 — 네트워크 클러스터 앞당김**: `cisco-ios-patterns`·`network-config-validation`·`network-interface-health`(B)를 W3에 함께 넣었다. homelab-*·netmiko·bgp가 이 셋을 참조한다. B로 분류된 이유였던 ECC 에이전트 참조만 지웠다. W4 infra-devops는 `platform-factory` 하나 남는다.
- **W3 — remotion-video-creation 보류**: ECC가 remotion-dev/skills에서 "port"한 스킬인데 원 저장소에 LICENSE가 없다(GitHub API 확인, 2026-11-27). ECC의 MIT가 이 파일에 적용된다는 근거가 없어 재배포하지 않는다.
- **allinone 영향**: 결정 2에 따라 agentic·sdlc·dev-toolkit을 확장하면 allinone 설치에도 들어간다(W2·W3 누적 18개). 결정 3(opt-in)은 신규 플러그인에만 적용된다.

