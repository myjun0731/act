# 제3자 고지 (Third-party notices)

core의 훅·상태줄·setup·메모리 커맨드는 직접 작성했다. 아래 스킬만 외부에서 가져왔다.

## ECC (Everything Claude Code)
- 출처: https://github.com/affaan-m/ECC
- 가져온 커밋: `4adeee6732a12d1540f49a4d50a38ce8c97f9a53` (v2.2.3)
- 라이선스: MIT (아래 원문)

### 가져온 파일 (0.2.0)
- `skills/config-gc`, `skills/skill-stocktake`(scripts 포함), `skills/skill-scout`, `skills/mcp-dependency-review`

### 변경한 내용
- `skills/skill-stocktake/SKILL.md`
  - 스크립트 경로 `~/.claude/skills/skill-stocktake/scripts/` → `<skill-base-dir>/scripts/` (플러그인 안에서는 원래 경로가 없음)
  - 결과 캐시 `~/.claude/skills/skill-stocktake/results.json` → `~/.claude/managed/skill-stocktake/results.json` (플러그인 업데이트 때 지워지지 않게)
  - 위 내용을 알리는 안내 한 줄 추가
- 그 외 파일은 원본 그대로.

### 원본 라이선스

```
MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
