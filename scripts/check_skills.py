#!/usr/bin/env python
"""스킬·에이전트 린트 (skillcheck): 프론트매터 규칙 + ECC 런타임 결합 검사.

agents/*.md 도 같은 ECC 결합 검사와 프론트매터 검사(name=파일명, description 필수)를 받는다.

check_refs.py 는 workflows/*.js 의 참조만 본다. SKILL.md 본문(과 references/·scripts/ 등 동봉 파일)에
남은 ECC 전용 참조 — `/ck` 같은 커맨드, ECC 에이전트, act 에 없는 ECC 스킬, `~/.dsh`·hermes 같은 런타임 —
는 정적 검사를 통과한 뒤 설치한 사람의 환경에서 깨진다. 이 린트가 그 틈을 막는다.
marketplace.json 의 로컬 플러그인만 스캔한다. 의존성 0(표준 라이브러리), 결정적.

ECC 이름 목록은 scripts/ecc_refs.json(gen_ecc_refs.py 로 고정 커밋에서 생성)을 쓴다. 없으면 ERROR 다.

심각도
  ERROR  프론트매터 없음 · name 누락/디렉터리명 불일치/형식 위반 · description 누락
  ERROR  ECC 런타임 마커(~/.dsh, hermes, nanoclaw, /ck, cost-tracker, gateguard 등)
  ERROR  ECC 스킬·에이전트·커맨드 참조가 act 로컬 플러그인 어디에도 없음(설치 후 깨지는 참조)
  ERROR  scripts/ecc_refs.json 이 없음(ECC 참조 검사 불가)
  ERROR  마크다운 상대 링크의 대상 파일이 없음(코드 블록·인라인 코드 안은 제외)
  WARN   알 수 없는 프론트매터 키 · description 1024자 초과
  WARN   참조가 act 가 아닌 공식 플러그인(feature-dev 등)에만 있음 — 그 플러그인을 의존성으로 두거나 "있으면 적용"으로 쓸 것
  WARN   metadata.origin 이 외부인데 플러그인에 ATTRIBUTION.md/THIRD_PARTY_NOTICES.md/NOTICE.md 가 없음
  INFO   같은 스킬명이 여러 로컬 플러그인에 있음
  INFO   검사하지 않은 파일(심볼릭 링크, 2MB 이상)

베이스라인
  이 린트를 도입할 때 이미 있던 ERROR 는 scripts/skillcheck_baseline.json 에 기록돼 있다. 기록된 ERROR 는
  WARN(kind 끝에 ':baseline')으로 낮춰 보고한다 — 새로 생긴 ERROR 만 차단한다. ECC 스킬을 포팅해 참조가
  풀리거나 원본을 고치면 그 항목은 사라지고, 남은 베이스라인 항목 중 더 이상 안 나오는 것은 INFO 로 알린다.
  정리 후 --update-baseline 으로 다시 쓴다(새 ERROR 를 덮어 감추는 용도로 쓰지 말 것).

사용
  python scripts/check_skills.py                # text, (베이스라인 밖) ERROR 있으면 exit 1
  python scripts/check_skills.py --format json
  python scripts/check_skills.py --strict       # WARN 도 exit 1 (베이스라인 항목 제외)
  python scripts/check_skills.py --plugin web3  # 한 플러그인만
  python scripts/check_skills.py --no-baseline  # 베이스라인 무시(전체 부채 보기)
  python scripts/check_skills.py --update-baseline
"""
import argparse, json, re, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "scripts" / "skillcheck_baseline.json"
TEXT_EXT = {".md", ".txt", ".json", ".yaml", ".yml", ".py", ".js", ".mjs", ".cjs", ".ts", ".sh", ".ps1", ".toml", "",
            ".lua", ".rb", ".bash", ".zsh", ".tsx", ".jsx"}  # 스킬에 동봉될 수 있는 스크립트 언어도 검사
MAX_TEXT_BYTES = 2_000_000

ALLOWED_KEYS = {
    "name", "description", "license", "metadata", "allowed-tools", "argument-hint", "disable-model-invocation",
    "user-invocable", "model", "when_to_use", "version", "compatibility",
}
AGENT_KEYS = {"name", "description", "tools", "model", "color", "metadata", "license", "disallowedTools", "permissionMode",
              "skills", "effort", "maxTurns"}
# 마크다운 상대 링크: [텍스트](경로). 코드 블록·인라인 코드 안의 것은 예시라 제외한다.
MD_LINK = re.compile(r"(?<!!)\[[^\]\n]*\]\(([^)\s]+)\)")
FENCE = re.compile(r"```.*?```|~~~.*?~~~", re.S)
INLINE_CODE = re.compile(r"`[^`\n]*`")
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
OWN_ORIGINS = {"", "act"}  # 이 값이면 외부 출처 아님

# ECC 하네스 없이는 동작하지 않는 런타임 마커
RUNTIME = [
    ("ECC 설치·하네스 전제", r"~/\.claude/(?:ecc|skills/ecc)\b|\bconfigure-ecc\b|\bECC[- ]native\b|\bfrom the ECC repository\b|\bin the ECC repository\b"),
    ("DeepSeek Harness 루트", r"~/\.dsh\b|\bDeepSeek Harness\b"),
    ("hermes 런타임", r"\bhermes-imports\b|~/\.hermes\b|\bHermes (?:operator|runtime|workflows?|imports?)\b"),
    ("nanoclaw 런타임", r"\bnanoclaw\b"),
    ("ck 메모리 커맨드", r"(?<![\w/-])/ck\b|\bContext Keeper\b"),
    ("ECC cost-tracker", r"\bcost-tracker\b"),
    ("ECC 훅", r"\bgateguard\b|\bdelivery-gate\b|hooks/memory-persistence"),
    ("ECC instinct", r"/instinct-(?:status|import|export)\b"),
    ("ECC2 대시보드", r"\becc2\b|\becc_dashboard\b"),
]
RUNTIME = [(label, re.compile(rx, re.I)) for label, rx in RUNTIME]

# 단어 하나이거나 일반 명사라 본문에 흔히 나오는 이름: 백틱·경로 형태일 때만 참조로 본다
GENERIC = {
    "seo", "taste", "council", "uncloud", "videodb", "leanrea", "ck", "architect", "planner", "benchmark", "blueprint",
    "pipeline", "setup", "jira", "learn", "plan", "pr", "prune", "promote", "checkpoint", "evolve", "projects",
    "sessions", "aside", "pm2", "build-fix", "error-handling", "coding-standards", "accessibility", "design-system",
    "deep-research", "quality-gate", "security-review", "code-review",
}

# act 가 아닌 공식 플러그인에 있는 이름. 이 이름은 ERROR 대신 WARN(공식 플러그인 의존).
EXTERNAL = {
    "agents": {
        "code-architect": "feature-dev", "code-explorer": "feature-dev", "code-reviewer": "feature-dev/pr-review-toolkit",
        "code-simplifier": "pr-review-toolkit", "comment-analyzer": "pr-review-toolkit", "pr-test-analyzer": "pr-review-toolkit",
        "silent-failure-hunter": "pr-review-toolkit", "type-design-analyzer": "pr-review-toolkit",
    },
    "commands": {
        "code-review": "Claude Code 내장", "security-review": "Claude Code 내장", "init": "Claude Code 내장",
        "plan": "Claude Code 내장", "review-pr": "pr-review-toolkit", "feature-dev": "feature-dev",
        "hookify": "hookify", "hookify-configure": "hookify", "hookify-help": "hookify", "hookify-list": "hookify",
    },
}


def _read(p):
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def parse_frontmatter(text):
    """최상위 키만 읽는 단순 YAML 파서. (keys:list, values:dict, origin:str|None) 또는 None."""
    m = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", text, re.S)
    if not m:
        return None
    keys, vals, cur, buf = [], {}, None, []
    origin = None
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if km:
            if cur is not None:
                vals[cur] = " ".join(buf).strip()
            cur, rest = km.group(1), km.group(2).strip()
            keys.append(cur)
            buf = [] if rest in (">", ">-", "|", "|-", "") else [rest.strip("\"'")]
        elif cur is not None:
            om = re.match(r"^\s+origin:\s*(.*)$", line)
            if cur == "metadata" and om:
                origin = om.group(1).strip().strip("\"'")
            elif cur != "metadata":
                buf.append(line.strip())
    if cur is not None:
        vals[cur] = " ".join(buf).strip()
    return keys, vals, origin


def _ref_re(name):
    if name in GENERIC or "-" not in name:
        return re.compile(r"(?:`|skills/|agents/)" + re.escape(name) + r"(?:`|/|\.md\b)")
    # '/' 앞은 허용: ../name/SKILL.md, skills/name/ 같은 경로·링크 안의 참조도 잡는다.
    return re.compile(r"(?<![\w.-])" + re.escape(name) + r"(?![\w-])")


def _cmd_re(name):
    # 문장 끝 마침표('/plan-prd.')는 잡고, 파일 확장자('/plan.md')는 제외한다.
    return re.compile(r"(?:^|[\s`(\"'])/" + re.escape(name) + r"(?![\w/-]|\.\w)", re.M)


def build_inventory(root):
    mkt = json.loads((root / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    plugins = {}
    for e in mkt.get("plugins", []):
        src = e.get("source")
        if not (isinstance(src, str) and src.startswith("./")):
            continue
        pdir = (root / src).resolve()
        pj = pdir / ".claude-plugin" / "plugin.json"
        if not pj.exists():
            continue
        name = json.loads(pj.read_text(encoding="utf-8")).get("name") or e.get("name")
        plugins[name] = {
            "dir": pdir,
            "skills": sorted(d for d in (pdir / "skills").iterdir() if (d / "SKILL.md").is_file()) if (pdir / "skills").is_dir() else [],
            "agents": {f.stem for f in (pdir / "agents").glob("*.md")} if (pdir / "agents").is_dir() else set(),
            "agent_files": sorted((pdir / "agents").glob("*.md")) if (pdir / "agents").is_dir() else [],
            "commands": {f.stem for f in (pdir / "commands").glob("*.md")} if (pdir / "commands").is_dir() else set(),
        }
    return plugins


def load_ecc(root):
    p = root / "scripts" / "ecc_refs.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text(encoding="utf-8"))
    return {
        "sha": d.get("sha", "")[:7],
        "skills": {n: _ref_re(n) for n in d.get("skills", [])},
        "agents": {n: _ref_re(n) for n in d.get("agents", [])},
        "commands": {n: _cmd_re(n) for n in d.get("commands", [])},
    }


def _skill_texts(sdir, skipped):
    """스킬 디렉터리 안의 텍스트 파일. 심볼릭 링크는 따라가지 않고, 너무 큰 파일은 skipped 에 기록한다."""
    stack = [sdir]
    while stack:
        cur = stack.pop()
        for f in sorted(cur.iterdir(), reverse=True):
            if f.is_symlink():
                skipped.append((f, "심볼릭 링크"))
            elif f.is_dir():
                stack.append(f)
            elif f.is_file() and f.suffix.lower() in TEXT_EXT:
                size = f.stat().st_size
                if size >= MAX_TEXT_BYTES:
                    skipped.append((f, f"{size // 1_000_000}MB — 크기 제한 초과"))
                else:
                    yield f, _read(f)


def check(root=ROOT, only=None):
    root = Path(root).resolve()
    plugins = build_inventory(root)
    ecc = load_ecc(root)
    act_skills = {d.name for p in plugins.values() for d in p["skills"]}
    act_agents = set().union(*(p["agents"] for p in plugins.values())) if plugins else set()
    act_cmds = set().union(*(p["commands"] for p in plugins.values())) if plugins else set()
    findings = []

    def add(sev, kind, ref, file, detail):
        findings.append({"severity": sev, "kind": kind, "ref": ref, "file": file, "detail": detail})

    def scan(f, txt, own_kind, own_name):
        """한 파일 본문의 ECC 런타임 마커와 act 에 없는 ECC 스킬·에이전트·커맨드 참조."""
        frel = f.relative_to(root).as_posix()
        if f.suffix.lower() == ".md":
            body = INLINE_CODE.sub("", FENCE.sub("", txt))
            for m in MD_LINK.finditer(body):
                target = m.group(1).split("#", 1)[0]
                if not target or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith(("${", "<", "/")):
                    continue
                if not (f.parent / target).exists():
                    add("ERROR", "broken-link", target, frel, f"상대 링크 '{m.group(1)}' 의 대상 파일이 없음")
        for label, rx in RUNTIME:
            m = rx.search(txt)
            if m:
                # ref 는 마커 종류(label): 문구·대소문자가 바뀌어도 베이스라인 키가 유지된다.
                add("ERROR", "ecc-runtime", label, frel, f"ECC 런타임 참조 '{m.group(0)}' ({label}) — act 에서 동작하지 않음")
        for kind, act_set, ext in (("skills", act_skills, {}), ("agents", act_agents, EXTERNAL["agents"]),
                                   ("commands", act_cmds, EXTERNAL["commands"])):
            for n, rx in ecc[kind].items():
                if kind == own_kind and n == own_name:
                    continue
                if n in act_set or not rx.search(txt):
                    continue
                label = {"skills": "스킬", "agents": "에이전트", "commands": "커맨드"}[kind]
                shown = "/" + n if kind == "commands" else n
                if n in ext:
                    add("WARN", f"ecc-{kind}-external", n, frel, f"{label} '{shown}'은 act 에 없고 {ext[n]}에만 있음")
                else:
                    add("ERROR", f"ecc-{kind}", n, frel, f"ECC {label} '{shown}' 참조 — act 로컬 플러그인에 없음 (ECC@{ecc['sha']})")

    if ecc is None:
        # 목록이 없으면 ECC 참조 검사가 통째로 꺼진다 — 조용히 통과시키지 않는다.
        add("ERROR", "ecc-refs-missing", "ecc_refs.json", "scripts/ecc_refs.json",
            "ECC 이름 목록이 없어 ECC 참조 검사를 할 수 없음 — python scripts/gen_ecc_refs.py <ECC 체크아웃> 으로 생성")

    owners = {}
    for pname, p in plugins.items():
        for d in p["skills"]:
            owners.setdefault(d.name, []).append(pname)
    for sname, ps in sorted(owners.items()):
        if len(ps) > 1 and (only is None or only in ps):
            add("INFO", "dup-skill", sname, ", ".join(ps), f"스킬명 '{sname}'이 여러 플러그인에 있음: {', '.join(ps)}")

    for pname, p in plugins.items():
        if only and pname != only:
            continue
        has_notice = any((p["dir"] / n).exists() for n in ("ATTRIBUTION.md", "THIRD_PARTY_NOTICES.md", "NOTICE.md"))
        for sdir in p["skills"]:
            rel = sdir.relative_to(root).as_posix()
            skill_md = sdir / "SKILL.md"
            fm = parse_frontmatter(_read(skill_md))
            if fm is None:
                add("ERROR", "frontmatter", sdir.name, f"{rel}/SKILL.md", "프론트매터(--- … ---)가 없음")
                continue
            keys, vals, origin = fm
            name = vals.get("name", "")
            if not name:
                add("ERROR", "name", sdir.name, f"{rel}/SKILL.md", "name 이 없음")
            elif name != sdir.name:
                add("ERROR", "name", name, f"{rel}/SKILL.md", f"name '{name}' ≠ 디렉터리명 '{sdir.name}'")
            elif not NAME_RE.match(name) or len(name) > 64:
                add("ERROR", "name", name, f"{rel}/SKILL.md", f"name '{name}'은 소문자 kebab-case 64자 이하여야 함")
            desc = vals.get("description", "")
            if not desc:
                add("ERROR", "description", sdir.name, f"{rel}/SKILL.md", "description 이 없음")
            elif len(desc) > 1024:
                add("WARN", "description", sdir.name, f"{rel}/SKILL.md", f"description {len(desc)}자 (1024 초과)")
            for k in keys:
                if k not in ALLOWED_KEYS:
                    add("WARN", "frontmatter-key", k, f"{rel}/SKILL.md", f"알 수 없는 프론트매터 키 '{k}'")
            if origin is not None and origin.strip() not in OWN_ORIGINS and not has_notice:
                add("WARN", "attribution", sdir.name, rel, f"origin '{origin}'인데 {pname}에 ATTRIBUTION/NOTICE 파일이 없음")

            if ecc is None:
                continue
            skipped = []
            for f, txt in _skill_texts(sdir, skipped):
                scan(f, txt, "skills", sdir.name)
            for f, why in skipped:
                add("INFO", "skipped-file", f.name, f.relative_to(root).as_posix(), f"검사하지 않음: {why}")

        # 에이전트: 프론트매터(name=파일명, description) + 본문의 ECC 결합
        for af in p["agent_files"]:
            arel = af.relative_to(root).as_posix()
            if af.is_symlink():
                add("INFO", "skipped-file", af.name, arel, "검사하지 않음: 심볼릭 링크")
                continue
            atxt = _read(af)
            fm = parse_frontmatter(atxt)
            if fm is None:
                add("ERROR", "frontmatter", af.stem, arel, "에이전트 프론트매터(--- … ---)가 없음")
                continue
            keys, vals, _ = fm
            aname = vals.get("name", "")
            if not aname:
                add("ERROR", "name", af.stem, arel, "에이전트 name 이 없음")
            elif aname != af.stem:
                add("ERROR", "name", aname, arel, f"에이전트 name '{aname}' ≠ 파일명 '{af.stem}'")
            if not vals.get("description", ""):
                add("ERROR", "description", af.stem, arel, "에이전트 description 이 없음")
            for k in keys:
                if k not in AGENT_KEYS:
                    add("WARN", "frontmatter-key", k, arel, f"알 수 없는 에이전트 프론트매터 키 '{k}'")
            if ecc is not None:
                scan(af, atxt, "agents", af.stem)

    seen, uniq = set(), []
    for fnd in findings:
        key = (fnd["severity"], fnd["kind"], fnd["ref"], fnd["file"])
        if key not in seen:
            seen.add(key)
            uniq.append(fnd)
    return uniq


def _bkey(f):
    return f"{f['kind']}|{f['ref']}|{f['file']}"


def load_baseline(path=BASELINE):
    if not path.exists():
        return set()
    return set(json.loads(path.read_text(encoding="utf-8")).get("errors", []))


def apply_baseline(findings, baseline, only=None):
    """베이스라인에 있는 ERROR 는 WARN(':baseline')으로 낮추고, 사라진 베이스라인 항목은 INFO 로 알린다."""
    out, hit = [], set()
    for f in findings:
        k = _bkey(f)
        if f["severity"] == "ERROR" and k in baseline:
            hit.add(k)
            out.append({**f, "severity": "WARN", "kind": f["kind"] + ":baseline", "detail": f["detail"] + " [베이스라인]"})
        else:
            out.append(f)
    if only is None:
        for k in sorted(baseline - hit):
            kind, ref, file = k.split("|", 2)
            out.append({"severity": "INFO", "kind": "baseline-resolved", "ref": ref, "file": file,
                        "detail": f"베이스라인 항목 해소됨({kind} '{ref}') — --update-baseline 으로 정리"})
    return out


def check_with_baseline(root=ROOT, only=None):
    """release.py 용: 베이스라인을 적용한 결과."""
    return apply_baseline(check(root, only), load_baseline(Path(root) / "scripts" / "skillcheck_baseline.json"), only)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["text", "json"], default="text")
    ap.add_argument("--strict", action="store_true", help="WARN 도 실패(exit 1)로 취급(베이스라인 항목 제외)")
    ap.add_argument("--plugin", help="이 로컬 플러그인만 검사")
    ap.add_argument("--no-baseline", action="store_true", help="베이스라인을 무시하고 원래 심각도로 보고")
    ap.add_argument("--update-baseline", action="store_true", help="현재 ERROR 전체를 베이스라인으로 기록")
    a = ap.parse_args()
    raw = check(ROOT, a.plugin)
    if a.update_baseline:
        if a.plugin:
            sys.exit("--update-baseline 은 --plugin 과 함께 쓸 수 없음")
        errs = sorted({_bkey(f) for f in raw if f["severity"] == "ERROR"})
        BASELINE.write_text(json.dumps({"note": "check_skills.py 도입 시점의 기존 ERROR. 줄이기만 할 것.", "errors": errs},
                                       ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        print(f"[skillcheck] 베이스라인 {len(errs)}건 기록: {BASELINE.relative_to(ROOT).as_posix()}")
        return
    findings = raw if a.no_baseline else apply_baseline(raw, load_baseline(), a.plugin)
    n_err = sum(1 for f in findings if f["severity"] == "ERROR")
    n_warn = sum(1 for f in findings if f["severity"] == "WARN" and not f["kind"].endswith(":baseline"))
    if a.format == "json":
        print(json.dumps(findings, ensure_ascii=False, indent=2))
    else:
        if not findings:
            print("[skillcheck] 스킬 린트 OK")
        for f in findings:
            mark = {"ERROR": "✘", "WARN": "!", "INFO": "·"}[f["severity"]]
            print(f"  {mark} [{f['severity']}] {f['file']}: {f['detail']}")
        n_base = sum(1 for f in findings if f["kind"].endswith(":baseline"))
        print(f"[skillcheck] ERROR {n_err} · WARN {n_warn} · 베이스라인 {n_base} · 총 {len(findings)}")
    sys.exit(1 if n_err or (a.strict and n_warn) else 0)


if __name__ == "__main__":
    main()
