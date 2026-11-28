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


def config_dir():
    """Claude 가 실제로 읽는 설정 폴더: CLAUDE_CONFIG_DIR 이 있으면 그곳, 없으면 ~/.claude."""
    v = os.environ.get("CLAUDE_CONFIG_DIR")
    return Path(v).expanduser() if v else Path.home() / ".claude"


def enabled_plugins(cwd):
    """user → project → local 순으로 enabledPlugins 를 합쳐 켜진 '<이름>@<마켓>' 목록을 돌려준다."""
    files = [config_dir() / "settings.json"]
    if cwd:
        files += [Path(cwd) / ".claude" / "settings.json", Path(cwd) / ".claude" / "settings.local.json"]
    state = {}
    for f in files:
        try:
            state.update(json.loads(f.read_text(encoding="utf-8")).get("enabledPlugins") or {})
        except Exception:
            pass
    return [k for k, v in state.items() if v and "@" in k]


def duplicates(cwd):
    by_name = {}
    for key in enabled_plugins(cwd):
        name, _, mkt = key.partition("@")
        by_name.setdefault(name, []).append(mkt)
    return {n: m for n, m in by_name.items() if len(m) > 1}


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        payload = {}
    dup = duplicates(payload.get("cwd"))
    if dup:
        items = ", ".join(f"{n} ({' / '.join(m)})" for n, m in sorted(dup.items()))
        print(f"[core] 같은 이름의 플러그인이 여러 마켓플레이스에서 켜져 있습니다: {items}. "
              "스킬·커맨드가 중복되니 사용자에게 한쪽을 끄도록(claude plugin disable <이름>@<마켓>) 알려 주세요.")
    root = Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or Path(__file__).resolve().parents[1])
    managed = config_dir() / "managed" / "core"
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
