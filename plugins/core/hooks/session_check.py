#!/usr/bin/env python
"""SessionStart: core 초기 설정 상태를 점검한다.
- 설정이 이미 적용돼 있으면 상태줄 스크립트만 최신본으로 맞추고 조용히 끝난다.
- 적용 전이거나 플러그인이 새 버전이면, Claude 가 사용자에게 /core:setup 을 권하도록 한 줄을 남긴다.
stdout 은 세션 컨텍스트에 들어가므로 짧게 유지한다."""
import json, os, shutil, sys, filecmp
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def main():
    root = Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or Path(__file__).resolve().parents[1])
    managed = Path.home() / ".claude" / "managed" / "core"
    try:
        version = json.loads((root / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")).get("version")
    except Exception:
        version = None
    try:
        applied = json.loads((managed / "applied.json").read_text(encoding="utf-8")).get("version")
    except Exception:
        applied = None

    src, dst = root / "scripts" / "statusline.py", managed / "statusline.py"
    if dst.exists() and src.exists() and not filecmp.cmp(src, dst, shallow=False):
        try:
            shutil.copy2(src, dst)
        except Exception:
            pass

    if applied is None:
        print("[core] 초기 설정(/core:setup)이 아직 적용되지 않았습니다. 적절한 때 사용자에게 한 번 실행을 제안하세요.")
    elif version and applied != version:
        print(f"[core] core 플러그인이 {applied} → {version} 으로 바뀌었습니다. 설정 변경분이 있을 수 있으니 /core:setup 재실행을 제안하세요.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
