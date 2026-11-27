# 릴리스 채널 (4단계)

act 는 릴리스 단계를 **브랜치 채널**로 운영한다. Claude Code 에는 채널 개념이 없어,
채널 격리는 전적으로 **git 브랜치**가 담당한다. 단계 접미사와 `v<버전>` 태그는 사람이 읽고
특정 시드/정식에 **고정(pin)** 하기 위한 라벨이다.

| 채널 | 브랜치 | 마켓 버전 | GitHub Release |
|---|---|---|---|
| 개발자 베타 | `dev` | `1.x.y-dev.N` | prerelease |
| 공개 베타 | `beta` | `1.x.y-beta.N` | prerelease |
| 릴리스 후보(RC) | `rc` | `1.x.y-rc.N` | prerelease |
| 정식(GA) | `main` | `1.x.y` | latest |
| 긴급 보안 핫픽스(RSR) | `main` | `1.x.y+rsr.a` | latest |

- 단계 접미사는 **마켓플레이스 버전**(`marketplace.json` 의 `metadata.version`)에만 붙는다.
  **플러그인 버전**(`plugin.json`)은 평범한 semver 로 둔다 — Claude Code 는 설치/업데이트에
  플러그인 `version` 문자열 변화를 보고, 의존성 범위 해석에 semver 를 쓴다.
- `main` 이 기본 브랜치이므로 **무지정 설치 = 정식**이다.

## 설치 (채널별)

```
claude plugin marketplace add myjun0731/act            # 정식(GA)
claude plugin marketplace add myjun0731/act#rc         # RC
claude plugin marketplace add myjun0731/act#beta       # 공개 베타
claude plugin marketplace add myjun0731/act#dev        # 개발자 베타
claude plugin marketplace add myjun0731/act#v1.11.0-rc.1   # 특정 시드 고정
```

- 브랜치 ref(`#dev` 등)는 그 브랜치의 **최신 커밋**을 따라간다(= 그 채널의 새 시드를 계속 받음).
- 태그 ref(`#v1.11.0-rc.1`)는 **그 시드에 고정**된다(움직이지 않음).
- 채널 전환: `claude plugin marketplace remove act` 후 다른 ref 로 재추가.
  (마켓 `name` 이 `act` 하나라 **동시 1개 채널**. dev+정식 동시 사용은 지원 범위 밖 — 전환식.)

## 태그

| 태그 | 예 | 쓰임 |
|---|---|---|
| `v<마켓플레이스 버전>` | `v2.0.0`, `v2.0.0-rc.1` | 저장소 전체 스냅샷. 설치를 특정 시드·정식에 고정할 때 |
| `<플러그인>--v<플러그인 버전>` | `core--v0.5.0` | 플러그인별 버전(ga 에서만 생성). Claude Code 가 의존성 버전 범위를 풀 때 이 형식을 본다 |

## 릴리스 절차

### 시드 올리기 (각 채널에서)
해당 브랜치에서 작업을 커밋한 뒤:

```
python scripts/release.py --stage dev-beta --push      # dev 에서
python scripts/release.py --stage public-beta --push   # beta 에서
python scripts/release.py --stage rc --push            # rc 에서
python scripts/release.py --stage ga --push            # main 에서 (정식)
```

`release.py` 가 하는 일: 브랜치·동기화·CHANGELOG 검증 → `metadata.version` 을 다음 시드로 올려
`release: <버전>` 커밋 → `v<버전>` 태그 → push → GitHub Release(ga 만 `--latest`, 나머지 `--prerelease`).
`ga` 에서만 플러그인 버전 미증가를 막고 바뀐 플러그인에 `<플러그인>--v<버전>` 태그를 만든다.
`--push` 없이 실행하면 **미리보기**(아무것도 바꾸지 않음), `--tag` 는 로컬 커밋·태그까지만.

### 채널 승격
```
python scripts/promote.py dev-to-beta --run     # dev → beta (시드 beta.1 로 리셋)
python scripts/promote.py beta-to-rc --run      # beta → rc
python scripts/promote.py rc-to-ga --run        # rc → main (접미사 제거 = 정식 준비)
```
승격은 상위 브랜치를 대상에 머지(충돌 시 상위 우선)하고 버전 접미사를 재설정·push 한다.
승격 뒤 대상 브랜치에서 위 `release.py --stage ...` 로 태그·릴리스를 만든다.

### 포인트 릴리스 / RSR
- **포인트 릴리스(1.x.(y+1))**: `main` 에서 CHANGELOG 에 새 베이스 섹션을 추가하고 `dev` 로
  back-merge 한 뒤 dev 부터 다시 시드를 쌓는다.
- **RSR(긴급 보안)**: `main` 에서 보안 수정만 올리고 `python scripts/release.py --stage rsr --push`
  (`1.x.y+rsr.a`). 다음 포인트 릴리스에 흡수한다. **반드시 `dev` 로 back-merge** 한다.

## 주의

- 채널 구분은 **강제가 아니라 규약**이다. 공개 레포라 누구나 모든 브랜치를 볼 수 있고, README 의 설치
  안내로 채널을 고르게 유도할 뿐이다. 정말 가려야 하는 작업은 별도 비공개 레포에서 한다.

- 브랜치 추적 채널은 최신 커밋을 따라가므로, 같은 커밋에서 **버전 문자열이 안 바뀌면** 사용자는
  업데이트를 못 받는다. `release.py` 가 매 시드 `metadata.version` 을 올리고, 플러그인은 실제로
  바뀔 때 `plugin.json` 버전을 올린다.
- `-beta.N` 같은 접미사는 Claude Code 에서 **우선순위가 아니라 "다른 문자열"**일 뿐이다(설치 선택은
  브랜치가 결정). GitHub Release 의 prerelease/latest 플래그는 정리용이며 설치에 영향 없다.
- 의존성 범위에서 프리릴리스를 받으려면 제약에 `-0` 접미사가 필요하다(예: `^1.12.0-0`). 일반
  사용자는 기본적으로 beta 태그를 받지 않는다.
