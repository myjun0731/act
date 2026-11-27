#!/usr/bin/env python
"""act 채널 승격 — 한 채널에서 다음 채널로 올린다(브랜치 머지 + 접미사 재설정).

흐름:  dev ──dev-to-beta──> beta ──beta-to-rc──> rc ──rc-to-ga──> main

각 승격은 상위 브랜치를 대상 브랜치로 머지하고(충돌 시 상위 내용 우선 -X theirs),
마켓플레이스 버전의 단계 접미사를 대상 채널로 바꿔(시드 1로 리셋) 커밋·push 한다.
태그·GitHub Release 는 승격 뒤 대상 브랜치에서 release.py 로 따로 만든다(안내 출력).

  dev-to-beta :  1.x.y-dev.N  -> 1.x.y-beta.1   (브랜치 beta)
  beta-to-rc  :  1.x.y-beta.N -> 1.x.y-rc.1     (브랜치 rc)
  rc-to-ga    :  1.x.y-rc.N   -> 1.x.y          (브랜치 main; 정식)

※ 포인트 릴리스로 새 트레인을 시작할 때는 main 에서 CHANGELOG 에 새 베이스(1.x.(y+1)) 섹션을
   추가하고 dev 로 back-merge 한 뒤 dev 에서 다시 시드를 쌓는다. RSR(main 핫픽스)도 dev 로 back-merge 할 것.

사용
  python scripts/promote.py dev-to-beta          # 미리보기
  python scripts/promote.py dev-to-beta --run     # 실제 머지·커밋·push
"""
import argparse, re, subprocess, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
MKT = ROOT / ".claude-plugin" / "marketplace.json"

HOPS = {
    "dev-to-beta": {"source": "dev",  "target": "beta", "suffix": "beta"},
    "beta-to-rc":  {"source": "beta", "target": "rc",   "suffix": "rc"},
    "rc-to-ga":    {"source": "rc",   "target": "main", "suffix": None},
}


def git(*args, check=True):
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode != 0:
        sys.exit(f"[promote] git {' '.join(args)} 실패:\n{r.stderr.strip()}")
    return r


def read_mkt_version():
    text = MKT.read_text(encoding="utf-8")
    m = re.search(r'"metadata"\s*:\s*\{', text)
    sub = text[m.end():] if m else text
    v = re.search(r'"version"\s*:\s*"([^"]*)"', sub)
    return v.group(1) if v else None


def base_version(ver):
    return re.split(r"[-+]", ver, maxsplit=1)[0] if ver else ver


def set_mkt_version(newv):
    text = MKT.read_text(encoding="utf-8")
    m = re.search(r'"metadata"\s*:\s*\{', text)
    head, tail = text[: m.end()], text[m.end():]
    tail2 = re.sub(r'("version"\s*:\s*")[^"]*(")', r"\g<1>" + newv + r"\g<2>", tail, count=1)
    MKT.write_text(head + tail2, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("hop", choices=list(HOPS.keys()))
    ap.add_argument("--run", action="store_true", help="실제로 머지·커밋·push (기본은 미리보기)")
    a = ap.parse_args()
    h = HOPS[a.hop]
    src, tgt, suffix = h["source"], h["target"], h["suffix"]

    if git("status", "--porcelain").stdout.strip():
        sys.exit("[promote] 커밋하지 않은 변경이 있습니다. 먼저 정리하세요.")
    git("fetch", "--quiet", "origin", check=False)

    cur = read_mkt_version()
    base = base_version(cur)
    newv = base if suffix is None else f"{base}-{suffix}.1"

    print(f"[promote] {a.hop}:  {src} -> {tgt}")
    print(f"          버전  {cur}  ->  {newv}")
    if not a.run:
        print("\n미리보기입니다. 실제로 하려면 --run.")
        print("순서: ① 대상 브랜치 checkout ② 상위 머지(-X theirs) ③ 버전 접미사 재설정 커밋 ④ push")
        nxt = {"beta": "public-beta", "rc": "rc", "main": "ga"}[tgt]
        print(f"이후: git checkout {tgt} && python scripts/release.py --stage {nxt} --push")
        return

    git("checkout", tgt)
    git("merge", "-X", "theirs", "--no-ff", src, "-m", f"promote: {src} -> {tgt}")
    if read_mkt_version() != newv:
        set_mkt_version(newv)
        git("add", ".claude-plugin/marketplace.json")
        git("commit", "-m", f"promote: {tgt} 채널 버전 {newv}")
    git("push", "origin", tgt)
    nxt = {"beta": "public-beta", "rc": "rc", "main": "ga"}[tgt]
    print(f"{tgt} 로 승격·push 완료. 다음: python scripts/release.py --stage {nxt} --push")


if __name__ == "__main__":
    main()
