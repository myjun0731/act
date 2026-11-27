# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W3, 0.1.0)

- manim-video(+ assets), ui-demo, frontend-slides(+ scripts, references)
- **frontend-slides 스크립트는 네트워크를 쓴다**: `scripts/export-pdf.sh`가 임시 폴더(`mktemp -d`)에 `npm install playwright`와 `npx playwright install chromium`을 실행한다. `extract-pptx.py`는 `python-pptx`가 필요하다.
- **remotion-video-creation은 넣지 않았다**: ECC가 remotion-dev/skills에서 가져온 스킬인데 원 저장소에 라이선스가 없어(기본 저작권 보호) 재배포 근거가 확인되지 않는다.

### 변경한 내용
- manim-video: description의 "wider ECC video stack" → "a video editor or compositing tool". 관련 스킬 `video-editing`·`remotion-video-creation`·`content-engine`(act 미보유) 대신 일반 안내와 `ui-demo`.
- frontend-slides: "Related ECC Skills" → "Related Skills", 각 스킬이 있는 act 플러그인 표기.
