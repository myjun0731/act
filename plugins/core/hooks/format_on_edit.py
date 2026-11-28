#!/usr/bin/env python
"""PostToolUse: 편집한 파일을, 프로젝트가 prettier를 쓰도록 설정돼 있을 때만 자동 포맷.
- prettier 설정(.prettierrc* · prettier.config.* · package.json 의 "prettier" 키)이 있고
- 그 프로젝트의 node_modules/prettier 가 있을 때만 실행 → 아니면 조용히 no-op.
- 편집 파일에서 가장 가까운 node_modules/prettier 를 쓴다(세션 폴더와 다른 하위 패키지·모노레포에서도 동작).
- 단, 실행 폴더와 편집 파일이 세션 작업 폴더 안이고 node_modules 밖일 때만 실행한다(남의 저장소·의존성
  트리 안의 prettier 를 실행하지 않음).
- npx(.cmd 셈) 대신 node 로 prettier 의 JS 진입점을 직접 실행한다(셸·cmd.exe 를 거치지 않음 — 파일 이름의
  & | 같은 문자가 명령으로 해석되지 않게).
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
    """prettier 를 실행할 폴더. 그 폴더의 node_modules/prettier 코드를 실행하므로, 세션 작업 폴더(workspace)
    안이면서 node_modules(남의 패키지 트리) 밖인 곳만 허용한다 — 받아 둔 저장소·의존성 안의 파일을 편집했다고
    그 안의 prettier 코드가 실행되지 않게. 조건을 못 맞추면 None(포맷 안 함)."""
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

def prettier_entry(run_dir):
    """run_dir/node_modules/prettier 의 package.json bin 이 가리키는 JS 진입점. 패키지 폴더 밖을 가리키면 None."""
    pkg_dir = os.path.realpath(os.path.join(run_dir, "node_modules", "prettier"))
    try:
        with open(os.path.join(pkg_dir, "package.json"), encoding="utf-8") as f:
            pkg = json.load(f)
    except Exception:
        return None
    b = pkg.get("bin") if isinstance(pkg, dict) else None
    rel = b if isinstance(b, str) else (b.get("prettier") if isinstance(b, dict) else None)
    if not isinstance(rel, str) or not rel:
        return None
    entry = os.path.realpath(os.path.join(pkg_dir, rel))
    if not _inside(entry, pkg_dir) or not os.path.isfile(entry):
        return None
    return entry

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
    entry = prettier_entry(run_dir)
    node = shutil.which("node")
    if not entry or not node or not node.lower().endswith(("node", "node.exe")):
        sys.exit(0)
    try:
        # npx(.cmd 셈)를 거치지 않고 node 로 prettier 진입점을 직접 실행한다. Windows 에서 .cmd 는 cmd.exe 가
        # 인자를 다시 해석하므로, 파일 이름의 & | 같은 문자가 명령으로 주입될 수 있다(BatBadBut 류).
        subprocess.run([node, entry, "--write", os.path.realpath(path)],
                       cwd=run_dir, capture_output=True, timeout=30, shell=False)
    except Exception:
        pass
    sys.exit(0)

if __name__ == "__main__":
    main()
