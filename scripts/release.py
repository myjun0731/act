#!/usr/bin/env python
"""claude-pro 릴리스 스크립트 — 검증하고 태그를 만든다.

태그 두 종류
  v<마켓플레이스 버전>        저장소 전체 스냅샷. 설치를 특정 릴리스로 고정할 때 쓴다.
                              예) claude plugin marketplace add myjun0731/claude-pro@v1.0.0
  <플러그인>--v<플러그인 버전>  플러그인별 버전. Claude Code가 의존성 버전 범위를 풀 때 이 태그를 본다.
                              예) core--v0.2.0

규칙
  - main 브랜치, 깨끗한 작업 트리, origin/main 과 같은 커밋에서만 릴리스한다.
  - 플러그인 내용이 바뀌었는데 plugin.json 의 version 을 안 올렸으면 멈춘다.
  - CHANGELOG.md 에 이번 마켓플레이스 버전 섹션(## [x.y.z])이 있어야 한다.
  - 이미 있는 태그는 다시 만들지 않는다.

사용
  python scripts/release.py           # 미리보기 (아무것도 만들지 않음)
  python scripts/release.py --tag     # 로컬에 태그 생성
  python scripts/release.py --push    # 태그 생성 + origin 에 push
                                       (gh 로그인돼 있으면 CHANGELOG 섹션으로 GitHub Release 도 만든다)
"""
import argparse, json, shutil, subprocess, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]


def git(*args, check=True):
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode != 0:
        sys.exit(f"[release] git {' '.join(args)} 실패:\n{r.stderr.strip()}")
    return r


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def changelog_section(text, ver):
    import re
    m = re.search(r"^## \[" + re.escape(ver) + r"\][^\n]*\n(.*?)(?=^## \[|\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def find_gh():
    gh = shutil.which("gh")
    if gh:
        return gh
    p = Path(r"C:\Program Files\GitHub CLI\gh.exe")
    return str(p) if p.exists() else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", action="store_true", help="로컬 태그 생성")
    ap.add_argument("--push", action="store_true", help="태그 생성 후 origin 에 push")
    a = ap.parse_args()
    make = a.tag or a.push
    errors, warns = [], []

    # 1) 브랜치·작업 트리 상태
    branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    if branch != "main":
        errors.append(f"main 브랜치에서만 릴리스합니다 (지금: {branch}). dev 에서 작업한 뒤 main 에 합치세요.")
    if git("status", "--porcelain").stdout.strip():
        errors.append("커밋하지 않은 변경이 있습니다.")
    git("fetch", "--quiet", "--tags", "origin", check=False)
    head = git("rev-parse", "HEAD").stdout.strip()
    remote = git("rev-parse", "origin/main", check=False).stdout.strip()
    if remote and remote != head:
        errors.append("로컬 main 이 origin/main 과 다릅니다. 먼저 push 하거나 pull 하세요.")

    existing = set(git("tag", "--list").stdout.split())

    # 2) 마켓플레이스 버전 + CHANGELOG
    mkt = load(ROOT / ".claude-plugin" / "marketplace.json")
    mver = (mkt.get("metadata") or {}).get("version")
    if not mver:
        errors.append("marketplace.json 의 metadata.version 이 없습니다.")
    mtag = f"v{mver}"
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8") if (ROOT / "CHANGELOG.md").exists() else ""
    if mver and f"## [{mver}]" not in changelog:
        errors.append(f"CHANGELOG.md 에 '## [{mver}]' 섹션이 없습니다.")

    # 3) 플러그인별 버전 확인
    new_tags = []
    unbumped = False
    for e in mkt.get("plugins", []):
        src = e.get("source")
        if not (isinstance(src, str) and src.startswith("./")):
            continue  # 외부 원본(github·git-subdir)은 이 저장소에서 태그를 달지 않는다
        pdir = (ROOT / src).resolve()
        rel = pdir.relative_to(ROOT).as_posix()
        pj = load(pdir / ".claude-plugin" / "plugin.json")
        name, ver = pj["name"], pj.get("version")
        if not ver:
            errors.append(f"{name}: plugin.json 에 version 이 없습니다.")
            continue
        tag = f"{name}--v{ver}"
        if tag in existing:
            if git("diff", "--quiet", tag, "HEAD", "--", rel, check=False).returncode != 0:
                errors.append(f"{name}: {tag} 이후 내용이 바뀌었는데 version 이 {ver} 그대로입니다. plugin.json 의 version 을 올리세요.")
                unbumped = True
        else:
            new_tags.append((tag, f"{name} {ver}"))

    if mver and mtag in existing:
        if new_tags:
            errors.append(f"{mtag} 태그가 이미 있습니다. 플러그인 버전이 바뀌었으면 metadata.version 도 올리세요.")
        elif not unbumped:
            warns.append(f"{mtag} 은 이미 릴리스됐고 바뀐 플러그인도 없습니다.")
    elif mver:
        new_tags.append((mtag, f"claude-pro {mver}"))

    # 4) 검증기
    claude = shutil.which("claude")
    if claude:
        targets = ["."] + [e["source"] for e in mkt.get("plugins", []) if isinstance(e.get("source"), str)]
        for t in targets:
            r = subprocess.run([claude, "plugin", "validate", t], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            if r.returncode != 0 or "✘" in (r.stdout + r.stderr):
                errors.append(f"claude plugin validate {t} 실패")
    else:
        warns.append("claude CLI 가 없어 검증을 건너뜀")

    # 5) 출력
    print(f"[release] HEAD {head[:7]} on {branch}")
    for w in warns:
        print("  ! " + w)
    if errors:
        for e in errors:
            print("  ✘ " + e)
        sys.exit(1)
    if not new_tags:
        print("  만들 태그가 없습니다.")
        return
    for t, _ in new_tags:
        print(f"  + {t}")
    if not make:
        print("\n미리보기입니다. 태그를 만들려면 --tag, push 까지 하려면 --push.")
        return
    for t, msg in new_tags:
        git("tag", "-a", t, "-m", msg)
    print("로컬 태그 생성 완료.")
    if a.push:
        git("push", "origin", *[t for t, _ in new_tags])
        print("origin 에 push 완료.")
        if any(t == mtag for t, _ in new_tags):
            gh = find_gh()
            if not gh:
                print("gh 가 없어 GitHub Release 는 건너뜀.")
                return
            notes = changelog_section(changelog, mver) + (
                "\n\n설치를 이 버전으로 고정하려면:\n```\n"
                f"claude plugin marketplace add myjun0731/claude-pro@{mtag}\n"
                "claude plugin install allinone@myoun-pro\n```\n")
            r = subprocess.run([gh, "release", "create", mtag, "--verify-tag", "--latest",
                                "--title", f"claude-pro {mver}", "--notes-file", "-"],
                               cwd=ROOT, input=notes, capture_output=True, text=True, encoding="utf-8")
            if r.returncode == 0:
                print("GitHub Release 생성: " + r.stdout.strip())
            else:
                print("GitHub Release 생성 실패 (태그는 올라갔음): " + r.stderr.strip())


if __name__ == "__main__":
    main()
