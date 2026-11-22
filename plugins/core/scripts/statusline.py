#!/usr/bin/env python
"""Claude Code status line — 모델 · 폴더 · git 브랜치 · 컨텍스트."""
import sys, json, os, subprocess

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

def main():
    try:
        d = json.load(sys.stdin)
    except Exception:
        print("claude"); return
    model = (d.get("model") or {}).get("display_name") or "?"
    ws = d.get("workspace") or {}
    cwd = ws.get("current_dir") or d.get("cwd") or os.getcwd()
    base = os.path.basename(cwd.rstrip("/\\")) or cwd
    branch = ""
    try:
        r = subprocess.run(["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
                           capture_output=True, text=True, timeout=2)
        if r.returncode == 0:
            branch = r.stdout.strip()
    except Exception:
        pass
    # context 사용률(있으면)
    ctx = ""
    try:
        used = (d.get("context") or {}).get("used_percent")
        if used is None:
            used = (d.get("context_window") or {}).get("used_percentage")
        if used is not None:
            ctx = f"🧠 {int(used)}%"
    except Exception:
        pass
    # 비용·변경 라인(있으면)
    cost = d.get("cost") or {}
    money = ""
    try:
        usd = cost.get("total_cost_usd")
        if usd is not None:
            money = f"💰 ${usd:.2f}"
    except Exception:
        pass
    lines = ""
    try:
        add = cost.get("total_lines_added")
        rem = cost.get("total_lines_removed")
        if add or rem:
            lines = f"±{int(add or 0)}/{int(rem or 0)}"
    except Exception:
        pass
    parts = [f"⚡ {model}", f"📁 {base}"]
    if branch:
        parts.append(f"🌿 {branch}")
    if ctx:
        parts.append(ctx)
    if money:
        parts.append(money)
    if lines:
        parts.append(lines)
    print("   ".join(parts))

if __name__ == "__main__":
    main()
