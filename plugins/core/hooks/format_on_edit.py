#!/usr/bin/env python
"""PostToolUse: 편집한 파일을, 프로젝트가 prettier를 쓰도록 설정돼 있을 때만 자동 포맷.
- prettier 설정 파일이 있고(.prettierrc* / prettier in package.json 아님, 설정파일만 체크)
- npx로 prettier가 설치돼 있을 때(--no-install)만 실행 → 아니면 조용히 no-op.
안전: 설정 안 한 프로젝트는 절대 건드리지 않음."""
import sys, json, os, subprocess, shutil

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".md", ".html", ".vue"}
CFG_NAMES = [".prettierrc", ".prettierrc.json", ".prettierrc.js", ".prettierrc.cjs",
             ".prettierrc.yaml", ".prettierrc.yml", "prettier.config.js", "prettier.config.cjs"]

def has_prettier_config(start):
    d = os.path.dirname(os.path.abspath(start))
    for _ in range(25):
        for n in CFG_NAMES:
            if os.path.exists(os.path.join(d, n)):
                return True
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return False

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    ti = data.get("tool_input") or {}
    path = ti.get("file_path") or ""
    if not path or not os.path.isfile(path):
        sys.exit(0)
    if os.path.splitext(path)[1].lower() not in EXTS:
        sys.exit(0)
    if not has_prettier_config(path):
        sys.exit(0)
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit(0)
    try:
        subprocess.run([npx, "--no-install", "prettier", "--write", path],
                       capture_output=True, timeout=30)
    except Exception:
        pass
    sys.exit(0)

if __name__ == "__main__":
    main()
