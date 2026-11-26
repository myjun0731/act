#!/usr/bin/env python
"""플러그인 이름 참조 무결성 검증 (refcheck).

Claude Code는 워크플로→리프(`workflow('ns:name')`), 워크플로→에이전트(`agentType:'ns:name'`),
전 계층→스킬(프롬프트 산문의 `… 스킬`) 참조를 설치 후 런타임에만 해석한다. 이 정적 검증기는
설치/릴리스 시점에 marketplace.json의 로컬 플러그인만 스캔해 인벤토리를 만들고, workflows/*.js의
세 참조를 추출해 대조한다. 의존성 0(파이썬 표준 라이브러리), node/설치 불필요, 결정적.

심각도
  ERROR  리터럴 리프·에이전트 참조가 해당 플러그인 인벤토리에 없음(런타임 하드 실패) → 종료코드 1
  WARN   프롬프트 스킬이 같은 플러그인·선언된 의존 플러그인 어디에도 없고 다른 로컬 플러그인에만 있음
         (의존성 미선언 번들 드리프트; dependencies 로 선언하면 WARN 아님. "있으면 적용")
  ERROR  프롬프트 스킬이 어디에도 없음(오타) — 단, 같은 참조 런에 해석된 스킬이 1개 이상일 때만(오탐 억제)
  INFO   유사 중복 스킬명(예: database-migration vs database-migrations)

사용
  python scripts/check_refs.py                 # text, ERROR 있으면 exit 1
  python scripts/check_refs.py --format json    # JSON 출력
  python scripts/check_refs.py --strict         # WARN 도 exit 1 (rc/ga용)
"""
import argparse, json, re, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]


def _read(p):
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def _frontmatter_name(text):
    m = re.match(r"---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return None
    nm = re.search(r"^name:\s*(.+?)\s*$", m.group(1), re.M)
    return nm.group(1).strip().strip("'\"") if nm else None


def _frontmatter_tools(text):
    """에이전트 frontmatter 의 tools 목록. 없으면 None(= 전체 도구)."""
    m = re.match(r"---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return None
    t = re.search(r"^tools:\s*(.+?)\s*$", m.group(1), re.M)
    if not t:
        return None
    raw = t.group(1).strip().strip("[]")
    return {x.strip().strip("'\"") for x in raw.split(",") if x.strip()}


# 프롬프트가 '파일 쓰기'를 요구하는 표현(쓰기 도구 필요). 0.4.0 결함(design.js 작성자=architect) 회귀 방지.
WRITE_INTENT = re.compile(r"에\s*쓰고|에\s*써라|파일로\s*작성|저장하라|에도\s*저장|로\s*복사하라|덮어쓰기")
WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit", "Bash"}


def _agent_type_windows(text):
    """각 agentType:'ns:name' 리터럴과, 그 직전 agent( 부터 agentType 까지의 구간(= 프롬프트)을 돌려준다.
    중첩 템플릿 리터럴 때문에 괄호 파싱 대신 구간 방식을 쓴다(프롬프트가 변수면 그 정의는 못 본다 — 휴리스틱)."""
    code = _strip_js_comments(text)
    out = []
    for m in re.finditer(r"agentType:\s*['\"]([^'\"]+)['\"]", code):
        start = code.rfind("agent(", 0, m.start())
        out.append((m.group(1), code[start if start >= 0 else m.start():m.start()]))
    return out


def _meta_name(text):
    m = re.search(r"export\s+const\s+meta\s*=\s*\{", text)
    if not m:
        return None
    nm = re.search(r"name:\s*['\"]([^'\"]+)['\"]", text[m.end():])
    return nm.group(1) if nm else None


def build_inventory(root):
    """marketplace.json의 로컬(source='./...') 플러그인만 인벤토리화."""
    mkt = json.loads((root / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    plugins = {}
    skills_global = {}  # skill name -> set(plugin)
    for e in mkt.get("plugins", []):
        src = e.get("source")
        if not (isinstance(src, str) and src.startswith("./")):
            continue  # 외부(github/git-subdir) 플러그인은 범위 밖
        pdir = (root / src).resolve()
        pj_path = pdir / ".claude-plugin" / "plugin.json"
        if not pj_path.exists():
            continue
        pj = json.loads(pj_path.read_text(encoding="utf-8"))
        name = pj.get("name") or e.get("name")
        deps = set()  # 선언된 로컬 의존 플러그인(같은 마켓의 bare 이름, 또는 marketplace 미지정 객체)
        for d in (pj.get("dependencies") or []):
            if isinstance(d, str):
                deps.add(d)
            elif isinstance(d, dict) and not d.get("marketplace") and d.get("name"):
                deps.add(d["name"])
        inv = {"workflows": set(), "agents": set(), "agent_tools": {}, "skills": set(), "orchestrators": set(), "dir": pdir, "deps": deps}
        wf_dir = pdir / "workflows"
        if wf_dir.is_dir():
            for f in wf_dir.glob("*.js"):
                txt = _read(f)
                n = _meta_name(txt)
                if n:
                    inv["workflows"].add(n)
                    if re.search(r"\bworkflow\(", _strip_js_comments(txt)):  # workflow() 를 '호출'하면 오케스트레이터. 주석 속 workflow( 오탐 방지로 주석 제거 후 탐지(자식으로 호출되면 2단 중첩 throw)
                        inv["orchestrators"].add(n)
        ag_dir = pdir / "agents"
        if ag_dir.is_dir():
            for f in ag_dir.glob("*.md"):
                atxt = _read(f)
                n = _frontmatter_name(atxt) or f.stem
                inv["agents"].add(n)
                inv["agent_tools"][n] = _frontmatter_tools(atxt)
        sk_dir = pdir / "skills"
        if sk_dir.is_dir():
            for d in sk_dir.iterdir():
                if d.is_dir() and (d / "SKILL.md").exists():
                    inv["skills"].add(d.name)
                    skills_global.setdefault(d.name, set()).add(name)
        plugins[name] = inv
    return plugins, skills_global


def _strip_js_comments(text):
    """JS 소스에서 주석을 제거한다(블록 /* */ · 라인 //). 오케스트레이터 판별 시
    주석·문자열에 적힌 'workflow(' 를 실제 호출로 오인하지 않도록 쓴다(호출이 아니면 제거돼도 무방)."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)   # 블록 주석
    text = re.sub(r"//[^\n]*", "", text)                  # 라인 주석
    return text


def _plain_string_arrays(text):
    """파일 안의 '평범한 문자열 배열' 리터럴 요소들을 모은다(LEAVES 등)."""
    out = []
    for m in re.finditer(r"=\s*\[\s*((?:['\"][a-z0-9][a-z0-9-]*['\"]\s*,?\s*)+)\]", text):
        out += re.findall(r"['\"]([a-z0-9][a-z0-9-]*)['\"]", m.group(1))
    return out


def extract_and_check(root, plugins, skills_global):
    findings = []

    def add(sev, kind, ref, file, detail):
        findings.append({"severity": sev, "kind": kind, "ref": ref, "file": file, "detail": detail})

    for pname, inv in plugins.items():
        wf_dir = inv["dir"] / "workflows"
        if not wf_dir.is_dir():
            continue
        for f in sorted(wf_dir.glob("*.js")):
            text = _read(f)
            rel = f.relative_to(root).as_posix()

            # 1) 리터럴 workflow('ns:name') — 미해석은 ERROR
            lit_wf = set(re.findall(r"workflow\(\s*['\"]([^'\"]+)['\"]", text))
            # 템플릿 workflow(`ns:${...}`) → 같은 파일의 평범한 문자열 배열 요소를 ns와 결합(크로스곱 "추정").
            # 파일에 여러 ns 템플릿이 있으면 크로스곱이 섞이므로, 템플릿 추정분은 미해석을 ERROR 로 보지 않고
            # "해석되는 참조의 오케스트레이터 2단 중첩"만 잡는다(리터럴만 엄격).
            tmpl_wf = set()
            for ns in set(re.findall(r"workflow\(\s*`([a-z0-9-]+):\$\{", text)):
                for elem in _plain_string_arrays(text):
                    tmpl_wf.add(f"{ns}:{elem}")

            def _chk_wf(ref, strict):
                ns, _, nm = ref.partition(":")
                if ns not in plugins:
                    if strict:
                        add("ERROR", "workflow", ref, rel, f"워크플로 참조 '{ref}' — 알 수 없는 플러그인 '{ns}'")
                    return
                if nm not in plugins[ns]["workflows"]:
                    if strict:
                        add("ERROR", "workflow", ref, rel, f"워크플로 참조 '{ref}' — '{ns}'에 워크플로 '{nm}' 없음")
                    return
                if nm in plugins[ns].get("orchestrators", set()):
                    add("ERROR", "workflow", ref, rel,
                        f"워크플로 참조 '{ref}' — 대상이 오케스트레이터(workflow() 호출)라 workflow()로 부르면 2단 중첩(런타임 throw). 리프만 호출하라")

            for ref in sorted(lit_wf):
                _chk_wf(ref, True)
            for ref in sorted(tmpl_wf - lit_wf):
                _chk_wf(ref, False)

            # 2) agentType: 'ns:name'
            for ref in sorted(set(re.findall(r"agentType:\s*['\"]([^'\"]+)['\"]", text))):
                ns, _, nm = ref.partition(":")
                if ns not in plugins:
                    add("ERROR", "agent", ref, rel, f"agentType '{ref}' — 알 수 없는 플러그인 '{ns}'")
                elif nm not in plugins[ns]["agents"]:
                    add("ERROR", "agent", ref, rel, f"agentType '{ref}' — '{ns}'에 에이전트 '{nm}' 없음")

            # 2.5) 쓰기 능력: 프롬프트가 파일 쓰기를 요구하는데 agentType 에이전트의 tools 에 쓰기 도구가 없음 → ERROR
            for ref, window in _agent_type_windows(text):
                ns, _, nm = ref.partition(":")
                if ns not in plugins or nm not in plugins[ns]["agents"]:
                    continue  # 위 2) 에서 이미 ERROR
                tools = plugins[ns]["agent_tools"].get(nm)
                hit = WRITE_INTENT.search(window)
                if hit and tools is not None and not (tools & WRITE_TOOLS):
                    add("ERROR", "agent-write", ref, rel,
                        f"agentType '{ref}' — 프롬프트가 파일 쓰기('{hit.group(0)}')를 요구하지만 tools({', '.join(sorted(tools))})에 쓰기 도구가 없음")

            # 3) 프롬프트 스킬: '<kebab 토큰 런> 스킬'
            for run in re.findall(r"([a-z0-9][a-z0-9-]*(?:·[a-z0-9][a-z0-9-]*)*)\s*스킬", text):
                tokens = run.split("·")
                resolved = [t for t in tokens if t in inv["skills"] or t in skills_global]
                if not resolved:
                    continue  # 산문으로 보고 넘김(오탐 억제)
                for t in tokens:
                    if t in inv["skills"]:
                        continue  # 같은 플러그인 OK
                    elif t in skills_global:
                        providers = skills_global[t]
                        if providers & inv.get("deps", set()):
                            continue  # 선언된 의존 플러그인이 제공 → 동반 설치 보장, 경고 아님
                        other = ",".join(sorted(providers))
                        add("WARN", "skill", t, rel,
                            f"스킬 '{t}' — '{pname}'에 없고 '{other}'에만 있음(의존성 미선언, 단독 설치 시 누락)")
                    else:
                        add("ERROR", "skill", t, rel, f"스킬 '{t}' — 어느 로컬 플러그인에도 없음(오타 의심)")

    # 4) 유사 중복 스킬명(단/복수) — 워크플로 유무와 무관하게 모든 로컬 플러그인에 적용한다.
    #    (위 루프는 workflows 디렉터리가 없으면 continue 로 건너뛰므로, 워크플로 없는
    #     플러그인의 스킬 단/복수 혼동을 놓치지 않도록 별도 루프로 분리한다.)
    for pname, inv in plugins.items():
        sk = inv["skills"]
        for s in sorted(sk):
            if s + "s" in sk:
                add("INFO", "dup", s, pname, f"유사 스킬명 '{s}' / '{s}s' 공존 — 혼동 주의")

    # 중복 finding 제거
    seen, uniq = set(), []
    for fnd in findings:
        key = (fnd["severity"], fnd["kind"], fnd["ref"], fnd["file"])
        if key not in seen:
            seen.add(key)
            uniq.append(fnd)
    return uniq


def check(root=ROOT):
    plugins, skills_global = build_inventory(Path(root))
    return extract_and_check(Path(root), plugins, skills_global)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["text", "json"], default="text")
    ap.add_argument("--strict", action="store_true", help="WARN 도 실패(exit 1)로 취급")
    a = ap.parse_args()
    findings = check(ROOT)
    n_err = sum(1 for f in findings if f["severity"] == "ERROR")
    n_warn = sum(1 for f in findings if f["severity"] == "WARN")

    if a.format == "json":
        print(json.dumps(findings, ensure_ascii=False, indent=2))
    else:
        if not findings:
            print("[refcheck] 이름 참조 무결성 OK")
        for f in findings:
            mark = {"ERROR": "✘", "WARN": "!", "INFO": "·"}[f["severity"]]
            print(f"  {mark} [{f['severity']}] {f['file']}: {f['detail']}")
        print(f"[refcheck] ERROR {n_err} · WARN {n_warn} · 총 {len(findings)}")

    fail = n_err > 0 or (a.strict and n_warn > 0)
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
