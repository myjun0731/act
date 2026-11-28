#!/usr/bin/env python
"""PostToolUse: 편집한 파일을, 프로젝트가 prettier를 쓰도록 설정돼 있을 때만 자동 포맷.
- prettier 설정(.prettierrc* · prettier.config.* · package.json 의 "prettier" 키)이 있고
- 그 프로젝트에 prettier 가 설치돼 있을 때(npx --no-install)만 실행 → 아니면 조용히 no-op.
- npx 는 현재 디렉터리의 node_modules 에서 prettier 를 찾으므로, 설정을 찾은 프로젝트 루트에서 실행한다
  (세션 폴더와 다른 하위 패키지·모노레포에서 편집해도 동작 — 이전에는 조용히 아무것도 안 했다).
- 단, 실행 폴더와 편집 파일이 세션 작업 폴더 안이고 node_modules 밖일 때만 실행한다(남의 저장소·의존성
  트리 안의 prettier 바이너리를 실행하지 않음).
안전: 설정 안 한 프로젝트는 절대 건드리지 않음."""
import sys, json, os, subprocess, shutil

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".md", ".html", ".vue"}
CFG_NAMES = [".prettierrc", ".prettierrc.json", ".prettierrc.json5", ".prettierrc.yaml", ".prettierrc.yml",
             ".prettierrc.toml", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs",
             ".prettierrc.ts", ".prettierrc.cts", ".prettierrc.mts",
             "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs",
             "prettier.config.ts", "prettier.config.cts", "prettier.config.mts"]

def _pkg_has_prettier(d):
    try:
        with open(os.path.join(d, "package.json"), encoding="utf-8") as f:
            pkg = json.load(f)
        return isinstance(pkg, dict) and "prettier" in pkg
    except Exception:
        return False

def find_prettier_root(start):
    """설정을 가진 가장 가까운 상위 디렉터리를 돌려준다(없으면 None)."""
    d = os.path.dirname(os.path.abspath(start))
    for _ in range(25):
        if any(os.path.exists(os.path.join(d, n)) for n in CFG_NAMES) or _pkg_has_prettier(d):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None

def install_root(start, fallback):
    """prettier 가 설치된(node_modules/prettier) 가장 가까운 상위 디렉터리. 없으면 설정 루트."""
    d = os.path.dirname(os.path.abspath(start))
    for _ in range(25):
        if os.path.isdir(os.path.join(d, "node_modules", "prettier")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return fallback

def _inside(child, parent):
    try:
        return os.path.commonpath([os.path.normcase(child), os.path.normcase(parent)]) == os.path.normcase(parent)
    except ValueError:  # 다른 드라이브
        return False

def trusted_run_dir(path, root, workspace):
    """prettier 를 실행할 폴더. npx 는 그 폴더의 node_modules/.bin 을 실행하므로, 세션 작업 폴더(workspace)
    안이면서 node_modules(남의 패키지 트리) 밖인 곳만 허용한다 — 받아 둔 저장소·의존성 안의 파일을 편집했다고
    그 안의 prettier 바이너리가 실행되지 않게. 조건을 못 맞추면 None(포맷 안 함)."""
    ws = os.path.realpath(workspace)
    run_dir = os.path.realpath(install_root(path, root))
    target = os.path.realpath(path)
    for p in (run_dir, target):
        if not _inside(p, ws):
            return None
        rel = os.path.relpath(p, ws)
        if "node_modules" in rel.replace("\\", "/").split("/"):
            return None
    return run_dir

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if not isinstance(data, dict):
        sys.exit(0)
    ti = data.get("tool_input") or {}
    path = ti.get("file_path") or ""
    if not path or not os.path.isfile(path):
        sys.exit(0)
    if os.path.splitext(path)[1].lower() not in EXTS:
        sys.exit(0)
    root = find_prettier_root(path)
    if not root:
        sys.exit(0)
    run_dir = trusted_run_dir(path, root, data.get("cwd") or os.getcwd())
    if not run_dir:
        sys.exit(0)
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit(0)
    try:
        subprocess.run([npx, "--no-install", "prettier", "--write", os.path.realpath(path)],
                       cwd=run_dir, capture_output=True, timeout=30)
    except Exception:
        pass
    sys.exit(0)

if __name__ == "__main__":
    main()
