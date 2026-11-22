# rules-payload

Claude Code 플러그인은 rules를 배포할 수 없어서, 규칙 원본만 여기에 둔다.
`core:setup`이 이 폴더를 `~/.claude/rules/dev-toolkit/`로 복사하는 것을 전제로 한다(core 플러그인 구현 시).

- `java/*.md`: frontmatter `paths: **/*.java` → Java 파일 작업 때만 적용
- `common/security.md`: 언어 무관 보안 원칙 (항상 적용)
