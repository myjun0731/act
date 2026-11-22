---
name: setup
description: core 플러그인 초기 설정. 플러그인으로 배포할 수 없는 권한 허용목록, 상태줄, env, 규칙(rules) 파일을 ~/.claude 에 병합하고 자동 업데이트를 켠다. "core 설정", "초기 설정 적용", "/core:setup" 요청에 쓴다.
disable-model-invocation: true
---

# core:setup

이 스킬 폴더의 `setup.py`를 실행해 `~/.claude/settings.json` 등에 설정을 병합한다.

1. 먼저 미리보기를 돌린다. 아무것도 바꾸지 않는다.
   ```
   python "<이 스킬의 base directory>/setup.py"
   ```
2. 출력된 변경 목록을 사용자에게 그대로 보여 주고, 적용할지 묻는다.
   - `statusLine: 이미 다른 상태줄을 쓰는 중이라 그대로 둠`이 나오면, 바꿀지 따로 물어본다. 바꾸겠다고 하면 `--force-statusline`을 붙인다.
3. 사용자가 동의하면 `--apply`를 붙여 다시 실행한다.
4. 출력된 백업 경로와 결과를 한두 줄로 알려 준다. 새 세션부터 반영된다는 것도 알린다.

주의
- 사용자 동의 없이 `--apply`를 실행하지 않는다.
- `python`이 없으면 `py`로 실행한다.
- 이미 적용돼 있으면 "이미 모두 적용돼 있습니다"가 나오고 끝난다. 여러 번 실행해도 안전하다.
