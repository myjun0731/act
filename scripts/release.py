#!/usr/bin/env python
"""claude-pro 릴리스 스크립트 (채널형) — 검증하고 버전을 올리고 태그를 만든다.

애플 OS식 4단계 채널을 브랜치로 구현한다.
  dev-beta     개발자 베타   브랜치 dev    버전 1.x.y-dev.N    (prerelease)
  public-beta  공개 베타     브랜치 beta   버전 1.x.y-beta.N   (prerelease)
  rc           릴리스 후보   브랜치 rc     버전 1.x.y-rc.N     (prerelease)
  ga           정식          브랜치 main   버전 1.x.y          (latest)
  rsr          긴급 보안     브랜치 main   버전 1.x.y+rsr.a    (latest, 다음 정식에 흡수)

단계 접미사는 '마켓플레이스 버전'(marketplace.json 의 metadata.version)에만 붙인다.
플러그인 버전(plugin.json)은 평범한 semver 로 둔다(= 의존성 범위 해석용). Claude Code 는
설치/업데이트에 플러그인 version 문자열 변화를 보고, 채널 격리는 '브랜치'가 담당한다.
단계 접미사와 v<버전> 태그는 사람이 읽고 특정 시드에 고정(#v1.x.y-rc.1)하기 위한 것이다.

태그
  v<마켓플레이스 버전>         저장소 스냅샷. 설치를 특정 시드/정식에 고정할 때 쓴다.
                              예) claude plugin marketplace add myjun0731/claude-pro#v1.11.0-rc.1
  <플러그인>--v<플러그인 버전>  (ga 에서만) 의존성 범위 해석용 플러그인별 태그.

규칙
  - 각 단계는 지정된 브랜치에서만 릴리스한다. 작업 트리는 깨끗하고 origin 과 동기화돼 있어야 한다.
  - CHANGELOG.md 에 '베이스 버전'(접미사 뗀 1.x.y) 섹션(## [x.y.z])이 있어야 한다.
  - ga 에서만 플러그인 버전 미증가(내용 바뀜+버전 그대로)를 막고, 바뀐 플러그인에 --v 태그를 만든다.
  - 이미 있는 태그는 다시 만들지 않는다.
  - 스크립트가 metadata.version 을 올려 'release: <버전>' 커밋을 만든다(--tag/--push 시).

사용
  python scripts/release.py --stage dev-beta            # 미리보기 (아무것도 바꾸지 않음)
  python scripts/release.py --stage dev-beta --tag       # 로컬: 버전 커밋 + 태그
  python scripts/release.py --stage ga --push            # 커밋 + 태그 + origin push + GitHub Release
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]

STAGES = {
    "dev-beta":    {"branch": "dev",  "suffix": "dev",  "prerelease": True,  "latest": False, "kind": "pre"},
    "public-beta": {"branch": "beta", "suffix": "beta", "prerelease": True,  "latest": False, "kind": "pre"},
    "rc":          {"branch": "rc",   "suffix": "rc",   "prerelease": True,  "latest": False, "kind": "pre"},
    "ga":          {"branch": "main", "suffix": None,   "prerelease": False, "latest": True,  "kind": "ga"},
    "rsr":         {"branch": "main", "suffix": "rsr",  "prerelease": False, "latest": True,  "kind": "rsr"},
}


def git(*args, check=True):
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode != 0:
        sys.exit(f"[release] git {' '.join(args)} 실패:\n{r.stderr.strip()}")
    return r


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def base_version(ver):
    """접미사(-dev.1, +rsr.a 등)를 떼고 베이스 1.x.y 만 남긴다."""
    return re.split(r"[-+]", ver, maxsplit=1)[0] if ver else ver


def set_marketplace_version(newv):
    """marketplace.json 의 metadata.version 만 정밀 치환한다(플러그인 엔트리는 건드리지 않음)."""
    p = ROOT / ".claude-plugin" / "marketplace.json"
    text = p.read_text(encoding="utf-8")
    m = re.search(r'"metadata"\s*:\s*\{', text)
    if not m:
        sys.exit("[release] marketplace.json 에 metadata 블록이 없습니다.")
    head, tail = text[: m.end()], text[m.end():]
    tail2, n = re.subn(r'("version"\s*:\s*")[^"]*(")', r"\g<1>" + newv + r"\g<2>", tail, count=1)
    if n != 1:
        sys.exit("[release] metadata.version 을 찾지 못했습니다.")
    p.write_text(head + tail2, encoding="utf-8")


def changelog_section(text, ver):
    m = re.search(r"^## \[" + re.escape(ver) + r"\][^\n]*\n(.*?)(?=^## \[|\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def find_gh():
    gh = shutil.which("gh")
    if gh:
        return gh
    p = Path(r"C:\Program Files\GitHub CLI\gh.exe")
    return str(p) if p.exists() else None


def next_version(stage, base, existing):
    """단계에 맞는 새 마켓플레이스 버전 문자열을 만든다."""
    cfg = STAGES[stage]
    if cfg["kind"] == "ga":
        return base
    if cfg["kind"] == "rsr":
        letters = []
        for t in existing:
            m = re.match(r"^v" + re.escape(base) + r"\+rsr\.([a-z])$", t)
            if m:
                letters.append(m.group(1))
        nxt = chr(ord(max(letters)) + 1) if letters else "a"
        return f"{base}+rsr.{nxt}"
    # prerelease (dev/beta/rc)
    suffix = cfg["suffix"]
    seeds = []
    for t in existing:
        m = re.match(r"^v" + re.escape(base) + r"-" + suffix + r"\.(\d+)$", t)
        if m:
            seeds.append(int(m.group(1)))
    n = (max(seeds) + 1) if seeds else 1
    return f"{base}-{suffix}.{n}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True, choices=list(STAGES.keys()), help="릴리스 채널 단계")
    ap.add_argument("--tag", action="store_true", help="로컬: 버전 커밋 + 태그")
    ap.add_argument("--push", action="store_true", help="커밋 + 태그 후 origin push (+ GitHub Release)")
    a = ap.parse_args()
    cfg = STAGES[a.stage]
    make = a.tag or a.push
    errors, warns = [], []

    # 1) 브랜치·작업 트리
    branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    if branch != cfg["branch"]:
        errors.append(f"{a.stage} 단계는 '{cfg['branch']}' 브랜치에서만 릴리스합니다 (지금: {branch}).")
    if git("status", "--porcelain").stdout.strip():
        errors.append("커밋하지 않은 변경이 있습니다. 먼저 정리하세요(스크립트가 버전 커밋을 만듭니다).")
    git("fetch", "--quiet", "--tags", "origin", check=False)
    head = git("rev-parse", "HEAD").stdout.strip()
    remote = git("rev-parse", f"origin/{cfg['branch']}", check=False).stdout.strip()
    if remote and remote != head:
        errors.append(f"로컬 {cfg['branch']} 이 origin/{cfg['branch']} 과 다릅니다. 먼저 push/pull 하세요.")

    existing = set(git("tag", "--list").stdout.split())

    # 2) 버전 계산
    mkt = load(ROOT / ".claude-plugin" / "marketplace.json")
    cur = (mkt.get("metadata") or {}).get("version")
    base = base_version(cur)
    if not base:
        errors.append("marketplace.json 의 metadata.version 이 없습니다.")
    newv = next_version(a.stage, base, existing) if base else None
    mtag = f"v{newv}" if newv else None

    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8") if (ROOT / "CHANGELOG.md").exists() else ""
    if base and f"## [{base}]" not in changelog:
        errors.append(f"CHANGELOG.md 에 베이스 버전 섹션 '## [{base}]' 이 없습니다.")
    if mtag and mtag in existing:
        errors.append(f"{mtag} 태그가 이미 있습니다.")

    # 3) ga 전용: 플러그인 버전 증가 확인 + 플러그인 태그 준비
    plugin_tags = []
    if cfg["kind"] == "ga":
        for e in mkt.get("plugins", []):
            src = e.get("source")
            if not (isinstance(src, str) and src.startswith("./")):
                continue
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
                    errors.append(f"{name}: {tag} 이후 내용이 바뀌었는데 version 이 {ver} 그대로입니다. 올리세요.")
            else:
                plugin_tags.append((tag, f"{name} {ver}"))

    # 4) 플러그인 매니페스트 검증
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
    print(f"[release] stage={a.stage}  branch={branch}  HEAD {head[:7]}")
    print(f"          {cur}  ->  {newv}   (tag {mtag}, prerelease={cfg['prerelease']}, latest={cfg['latest']})")
    for w in warns:
        print("  ! " + w)
    if errors:
        for e in errors:
            print("  ✘ " + e)
        sys.exit(1)
    if cfg["kind"] == "ga" and plugin_tags:
        for t, _ in plugin_tags:
            print(f"  + 플러그인 태그 {t}")
    if not make:
        print("\n미리보기입니다. 적용하려면 --tag, push 까지 하려면 --push.")
        return

    # 6) 버전 커밋 + 태그
    if cur != newv:
        set_marketplace_version(newv)
        git("add", ".claude-plugin/marketplace.json")
        git("commit", "-m", f"release: {newv}")
        head = git("rev-parse", "HEAD").stdout.strip()
    git("tag", "-a", mtag, "-m", f"claude-pro {newv}")
    for t, msg in plugin_tags:
        git("tag", "-a", t, "-m", msg)
    print(f"로컬 태그 생성: {mtag}" + (f" + 플러그인 {len(plugin_tags)}개" if plugin_tags else ""))

    if not a.push:
        print("push 하려면 --push 로 다시 실행하세요.")
        return

    # 7) push + GitHub Release
    git("push", "origin", cfg["branch"])
    git("push", "origin", mtag, *[t for t, _ in plugin_tags])
    print(f"origin/{cfg['branch']} 과 태그 push 완료.")

    gh = find_gh()
    if not gh:
        print("gh 가 없어 GitHub Release 는 건너뜀.")
        return
    install_ref = f"#{mtag}" if cfg["prerelease"] else ""
    notes = changelog_section(changelog, base) or f"claude-pro {newv}"
    notes += (
        f"\n\n단계: {a.stage}\n설치를 이 버전으로 고정하려면:\n```\n"
        f"claude plugin marketplace add myjun0731/claude-pro{install_ref}\n"
        "claude plugin install allinone@claude-pro\n```\n")
    cmd = [gh, "release", "create", mtag, "--verify-tag", "--title", f"claude-pro {newv}", "--notes-file", "-"]
    if cfg["prerelease"]:
        cmd.append("--prerelease")
    if cfg["latest"]:
        cmd.append("--latest")
    r = subprocess.run(cmd, cwd=ROOT, input=notes, capture_output=True, text=True, encoding="utf-8")
    if r.returncode == 0:
        print("GitHub Release 생성: " + r.stdout.strip())
    else:
        print("GitHub Release 생성 실패 (태그는 올라갔음): " + r.stderr.strip())


if __name__ == "__main__":
    main()
