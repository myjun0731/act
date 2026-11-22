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


def payload_sources(marketplace, reg, kind="rules-payload"):
    """(플러그인 이름, <kind> 폴더 경로) 목록. kind: rules-payload | settings-payload"""
    out = []
    if marketplace:
        for key, entries in reg.items():
            name, _, mkt = key.partition("@")
            if mkt != marketplace or not entries:
                continue
            p = Path(entries[-1].get("installPath", "")) / kind
            # 폴더 방식 마켓플레이스는 기록상 cache 경로라 원본 형제 폴더도 본다
            q = PLUGIN_ROOT.parent / name / kind
            if q.is_dir():
                p = q
            if p.is_dir():
                out.append((name, p))
    else:  # 등록 정보가 없을 때(--plugin-dir 로 띄운 로컬 테스트): 형제 폴더를 본다
        for d in sorted(PLUGIN_ROOT.parent.iterdir()):
            if (d / kind).is_dir():
                out.append((d.name, d / kind))
    return out


def rules_sources(marketplace, reg):
    return payload_sources(marketplace, reg, "rules-payload")


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
    ap.add_argument("--home", default=str(Path.home()))
    a = ap.parse_args()

    claude = Path(a.home) / ".claude"
    plugins_dir = claude / "plugins"
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
    rules = rules_sources(marketplace, reg)
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
    for name, p in payload_sources(marketplace, reg, "settings-payload"):
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
