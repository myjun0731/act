#!/usr/bin/env python
"""core:setup — 플러그인으로 배포할 수 없는 설정을 ~/.claude 에 병합한다.

기본은 미리보기(아무것도 쓰지 않음). --apply 를 붙여야 실제로 쓴다.

하는 일
  1. settings/base.json 의 env · permissions.allow 를 ~/.claude/settings.json 에 병합 (덮어쓰기 아님)
  2. 상태줄 스크립트를 고정 경로(~/.claude/managed/core/)에 복사하고 statusLine 을 그쪽으로 지정
     - 사용자가 이미 다른 statusLine 을 쓰고 있으면 건드리지 않음 (--force-statusline 으로 교체)
  3. 같은 마켓플레이스에서 설치된 플러그인의 rules-payload/ 를 ~/.claude/rules/<플러그인>/ 로 복사
     settings-payload/*.json 은 settings.json 에 합친다 (dict 재귀, list 합집합)
  4. 이 마켓플레이스가 git 기반이면 자동 업데이트를 켬 (extraKnownMarketplaces.<이름>.autoUpdate)
  5. settings.json 을 고치기 전에 settings.json.bak-core-<시각> 으로 백업

사용
  python setup.py            # 미리보기
  python setup.py --apply    # 적용
  옵션: --force-statusline, --home <경로> (테스트용 홈 디렉터리)
"""
import argparse, json, os, shutil, sys, time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

PLUGIN_ROOT = Path(__file__).resolve().parents[2]          # .../core
STATUS_MARK = "managed/core/statusline.py"


def load_json(p, default):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def same_path(a, b):
    try:
        return Path(a).resolve() == Path(b).resolve()
    except Exception:
        return False


def find_marketplace(plugins_dir):
    """installed_plugins.json 에서 이 core 의 '<plugin>@<marketplace>' 키를 찾는다."""
    reg = load_json(plugins_dir / "installed_plugins.json", {}).get("plugins", {})
    for key, entries in reg.items():
        for e in entries or []:
            if same_path(e.get("installPath", ""), PLUGIN_ROOT):
                return key.split("@", 1)[1], reg
    # 폴더 방식 마켓플레이스는 기록상 cache 경로지만 실제로는 원본 폴더에서 로드된다.
    # 그래서 이 core 가 어느 마켓플레이스 위치 안에 있는지로 다시 찾는다.
    known = load_json(plugins_dir / "known_marketplaces.json", {})
    me = PLUGIN_ROOT.resolve()
    for name, info in known.items():
        loc = info.get("installLocation") or (info.get("source") or {}).get("path")
        if loc and f"{PLUGIN_ROOT.name}@{name}" in reg:
            try:
                me.relative_to(Path(loc).resolve())
                return name, reg
            except ValueError:
                pass
    return None, reg


PLUGINS_DIR = None  # main() 에서 채운다


def plugin_dir(name, mkt, entry, core_mkt):
    """설치된 플러그인의 실제 폴더. 폴더 방식 마켓플레이스는 기록상 cache 경로지만 원본 폴더에서 로드된다."""
    if mkt == core_mkt and (PLUGIN_ROOT.parent / name).is_dir():
        return PLUGIN_ROOT.parent / name
    info = load_json(PLUGINS_DIR / "known_marketplaces.json", {}).get(mkt) or {}
    loc = info.get("installLocation") or (info.get("source") or {}).get("path")
    if loc:
        m = load_json(Path(loc) / ".claude-plugin" / "marketplace.json", {})
        for e in m.get("plugins", []):
            src = e.get("source")
            if e.get("name") == name and isinstance(src, str) and (Path(loc) / src).is_dir():
                return (Path(loc) / src).resolve()
    return Path(entry.get("installPath", ""))


def payload_sources(marketplace, reg, kind="rules-payload", trusted=()):
    """(플러그인 이름, <kind> 폴더 경로) 목록. kind: rules-payload | settings-payload

    core 와 같은 마켓플레이스, 그리고 base.json 의 payloadMarketplaces 에 적힌 마켓플레이스만 본다.
    settings 조각은 권한 허용목록까지 바꿀 수 있어서, 아무 마켓플레이스나 믿지 않는다.
    사용자 범위(scope=user)로 설치된 플러그인만 대상이다."""
    out = []
    if marketplace:
        allowed = {marketplace, *trusted}
        for key, entries in reg.items():
            name, _, mkt = key.partition("@")
            if mkt not in allowed:
                continue
            users = [e for e in entries or [] if e.get("scope") == "user"]
            if not users:
                continue
            p = plugin_dir(name, mkt, users[-1], marketplace) / kind
            if p.is_dir():
                out.append((name if mkt == marketplace else f"{name}@{mkt}", p))
    else:  # 등록 정보가 없을 때(--plugin-dir 로 띄운 로컬 테스트): 형제 폴더를 본다
        for d in sorted(PLUGIN_ROOT.parent.iterdir()):
            if (d / kind).is_dir():
                out.append((d.name, d / kind))
    return out


def rules_sources(marketplace, reg, trusted=()):
    return payload_sources(marketplace, reg, "rules-payload", trusted)


def deep_merge(dst, src, path, log):
    """src 를 dst 에 합친다. dict 는 재귀, list 는 합집합(순서 유지), 그 외는 값이 다를 때만 덮어쓴다."""
    for k, v in src.items():
        if k.startswith("_"):
            continue  # _comment 같은 설명용 키
        here = f"{path}.{k}" if path else k
        if isinstance(v, dict):
            if not isinstance(dst.get(k), dict):
                dst[k] = {}
            deep_merge(dst[k], v, here, log)
        elif isinstance(v, list):
            cur = dst.setdefault(k, [])
            if not isinstance(cur, list):
                dst[k] = cur = []
            added = [x for x in v if x not in cur]
            if added:
                cur.extend(added)
                log.append(f"{here} 에 {len(added)}개 추가")
        elif dst.get(k) != v:
            log.append(f"{here} = {v!r} (이전: {dst.get(k)!r})")
            dst[k] = v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--force-statusline", action="store_true")
    ap.add_argument("--home", default=None, help="이 폴더의 .claude 를 대상으로 (테스트용). 생략하면 CLAUDE_CONFIG_DIR, 그것도 없으면 ~/.claude")
    a = ap.parse_args()

    global PLUGINS_DIR
    # Claude 가 실제로 읽는 설정 폴더에 써야 한다 — CLAUDE_CONFIG_DIR 을 쓰는 환경에서 ~/.claude 에 쓰면 적용되지 않는다
    if a.home:
        claude = Path(a.home) / ".claude"
    elif os.environ.get("CLAUDE_CONFIG_DIR"):
        claude = Path(os.environ["CLAUDE_CONFIG_DIR"]).expanduser()
    else:
        claude = Path.home() / ".claude"
    plugins_dir = claude / "plugins"
    PLUGINS_DIR = plugins_dir
    settings_p = claude / "settings.json"
    managed = claude / "managed" / "core"
    base = load_json(PLUGIN_ROOT / "settings" / "base.json", {})
    version = load_json(PLUGIN_ROOT / ".claude-plugin" / "plugin.json", {}).get("version", "?")

    cur = load_json(settings_p, {})
    new = json.loads(json.dumps(cur))
    log = []      # 실제 변경
    notes = []    # 안내만 (변경 아님)

    # 1) env
    env = new.setdefault("env", {})
    for k, v in (base.get("env") or {}).items():
        if env.get(k) != v:
            log.append(f"env.{k} = {v!r} (이전: {env.get(k)!r})")
            env[k] = v
    if not env:
        new.pop("env")

    # 2) permissions.allow (합집합, 기존 순서 유지)
    want = (base.get("permissions") or {}).get("allow") or []
    perms = new.setdefault("permissions", {})
    allow = perms.setdefault("allow", [])
    added = [x for x in want if x not in allow]
    allow.extend(added)
    if added:
        log.append(f"permissions.allow 에 {len(added)}개 추가 (기존 {len(allow) - len(added)}개 유지)")

    # 3) statusLine
    sl_target = managed / "statusline.py"
    sl_cmd = f'python "{sl_target.as_posix()}"'
    existing = (new.get("statusLine") or {}).get("command", "")
    sl_ok = not existing or STATUS_MARK in existing.replace("\\", "/") or a.force_statusline
    if base.get("statusLine", {}).get("managed"):
        if sl_ok:
            if existing != sl_cmd:
                log.append(f"statusLine → {sl_cmd}")
            new["statusLine"] = {"type": "command", "command": sl_cmd,
                                 "padding": base["statusLine"].get("padding", 0)}
        else:
            notes.append(f"statusLine: 이미 다른 상태줄을 쓰는 중이라 그대로 둠 ({existing}). 바꾸려면 --force-statusline")

    # 4) 자동 업데이트
    marketplace, reg = find_marketplace(plugins_dir)
    known = load_json(plugins_dir / "known_marketplaces.json", {})
    src = (known.get(marketplace) or {}).get("source") if marketplace else None
    if src and src.get("source") in ("github", "git", "url"):
        ekm = new.setdefault("extraKnownMarketplaces", {})
        ent = ekm.setdefault(marketplace, {"source": src})
        if ent.get("autoUpdate") is not True:
            ent["autoUpdate"] = True
            log.append(f"마켓플레이스 '{marketplace}' 자동 업데이트 켬")
    elif marketplace:
        notes.append(f"마켓플레이스 '{marketplace}' 는 로컬 폴더 방식이라 자동 업데이트 설정 생략")
    else:
        notes.append("이 core 의 설치 기록을 못 찾음(로컬 테스트로 보임) → 자동 업데이트 설정 생략")

    # 5) rules
    # 신뢰 마켓: base.json(공개 기본값, 비어 있음) + PC별 환경변수 CORE_PAYLOAD_MARKETPLACES(쉼표 구분)
    env_trusted = [s.strip() for s in os.environ.get("CORE_PAYLOAD_MARKETPLACES", "").split(",") if s.strip()]
    trusted = tuple(dict.fromkeys(list(base.get("payloadMarketplaces") or []) + env_trusted))
    rules = rules_sources(marketplace, reg, trusted)
    rules_todo = []
    for name, p in rules:
        files = {f.relative_to(p).as_posix(): f.read_bytes()
                 for f in p.rglob("*.md") if f.name.lower() != "readme.md"}
        dst = claude / "rules" / name
        have = {f.relative_to(dst).as_posix(): f.read_bytes() for f in dst.rglob("*.md")} if dst.is_dir() else {}
        if files != have:
            rules_todo.append((name, p))
            log.append(f"rules: {name} → ~/.claude/rules/{name}/ ({len(files)}개 파일)")

    # 6) settings-payload: 같은 마켓플레이스 플러그인이 내놓은 settings 조각을 합친다
    for name, p in payload_sources(marketplace, reg, "settings-payload", trusted):
        for f in sorted(p.glob("*.json")):
            frag = load_json(f, {})
            sub = []
            deep_merge(new, frag, "", sub)
            log.extend(f"[{name}/{f.name}] {s}" for s in sub)

    sl_src = PLUGIN_ROOT / "scripts" / "statusline.py"
    sl_stale = not sl_target.exists() or sl_target.read_bytes() != sl_src.read_bytes()
    applied_stale = load_json(managed / "applied.json", {}).get("version") != version

    settings_changed = new != cur
    if not log and not sl_stale and not applied_stale:
        print(f"[core:setup v{version}] 이미 모두 적용돼 있습니다.")
        for line in notes:
            print("  · " + line)
        return
    print(f"[core:setup v{version}] {'적용' if a.apply else '미리보기 (아직 아무것도 바꾸지 않음)'}")
    for line in log:
        print("  - " + line)
    if sl_stale:
        print("  - 상태줄 스크립트를 ~/.claude/managed/core/ 에 복사")
    for line in notes:
        print("  · " + line)
    if not a.apply:
        print("\n적용하려면 --apply 를 붙여 다시 실행하세요.")
        return

    managed.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PLUGIN_ROOT / "scripts" / "statusline.py", sl_target)
    for name, p in rules_todo:
        dst = claude / "rules" / name
        if dst.exists():
            shutil.rmtree(dst)
        for f in p.rglob("*.md"):
            if f.name.lower() == "readme.md":
                continue
            t = dst / f.relative_to(p)
            t.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, t)
    if settings_changed:
        if settings_p.exists():
            bak = settings_p.with_name(f"settings.json.bak-core-{time.strftime('%Y%m%d-%H%M%S')}")
            shutil.copy2(settings_p, bak)
            print(f"\n백업: {bak}")
        settings_p.parent.mkdir(parents=True, exist_ok=True)
        settings_p.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (managed / "applied.json").write_text(json.dumps({"version": version}) + "\n", encoding="utf-8")
    print("완료. 새 세션부터 반영됩니다 (실행 중인 세션은 /reload-plugins 또는 재시작).")


if __name__ == "__main__":
    main()
