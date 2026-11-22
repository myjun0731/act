---
description: 배운 사실·결정·선호를 장기 메모리에 저장
argument-hint: "<기억할 내용>"
---
다음 내용을 **장기 메모리**에 저장해줘: $ARGUMENTS

규칙:
- 저장 위치: 이 세션의 메모리 디렉터리(시스템 안내에 나온 경로). 안내가 없으면 `~/.claude/projects/<현재 작업 폴더를 인코딩한 이름>/memory/`. **한 파일 = 한 사실**.
- frontmatter: `name`(kebab-case), `description`(한 줄), `metadata.type`(user | feedback | project | reference).
- feedback/project 타입이면 사실 다음에 `**Why:**`와 `**How to apply:**` 줄을 붙인다. 관련 메모리는 `[[name]]`으로 링크한다.
- `MEMORY.md` 인덱스에 `- [제목](파일.md) — 짧은 설명` 한 줄을 추가한다.
- 비슷한 메모리가 이미 있으면 새로 만들지 말고 그 파일을 고친다. 틀린 메모리는 지운다.
- 코드·git·CLAUDE.md로 이미 알 수 있는 것은 저장하지 않는다.

저장한 뒤 어떤 파일에 넣었는지 한 줄로 알려줘.
