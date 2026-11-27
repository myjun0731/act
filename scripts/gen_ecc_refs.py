#!/usr/bin/env python
"""ECC 참조 토큰 목록(scripts/ecc_refs.json) 생성기.

check_skills.py 가 SKILL.md 본문의 ECC 전용 참조(스킬·에이전트·커맨드)를 잡으려면 ECC 의 이름 목록이
필요하다. 린트를 돌릴 때마다 ECC 체크아웃을 요구하지 않도록, 고정 커밋에서 이름만 뽑아 저장소에 둔다.
분기별 업스트림 재대조 때 새 커밋으로 다시 생성한다.

사용
  python scripts/gen_ecc_refs.py <ECC 체크아웃 경로> [--allow-dirty]

체크아웃에 커밋하지 않은 변경·추적되지 않은 파일이 있으면 기록되는 sha 와 이름 목록이 어긋나므로 거부한다.

ECC 체크아웃의 파일은 읽기만 한다(스크립트 실행 없음). 디렉터리·파일 이름만 쓰고 본문은 읽지 않는다.
"""
import json, subprocess, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scripts" / "ecc_refs.json"


def main():
    args = [a for a in sys.argv[1:] if a != "--allow-dirty"]
    allow_dirty = len(args) != len(sys.argv) - 1
    if len(args) != 1:
        sys.exit(__doc__)
    ecc = Path(args[0]).resolve()
    if not (ecc / "skills").is_dir() or not (ecc / "agents").is_dir():
        sys.exit(f"ECC 체크아웃이 아님: {ecc}")
    sha = subprocess.run(["git", "-C", str(ecc), "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(ecc), "status", "--porcelain", "--", "skills", "agents", "commands"],
                           capture_output=True, text=True, check=True).stdout.strip()
    if dirty and not allow_dirty:
        sys.exit(f"ECC 체크아웃에 커밋하지 않은 변경이 있음(sha {sha[:7]}와 목록이 어긋남):\n{dirty}\n--allow-dirty 로 무시 가능")
    data = {
        "source": "https://github.com/affaan-m/ECC",
        "sha": sha,
        "skills": sorted(p.parent.name for p in (ecc / "skills").glob("*/SKILL.md")),
        "agents": sorted(p.stem for p in (ecc / "agents").glob("*.md")),
        "commands": sorted(p.stem for p in (ecc / "commands").glob("*.md")),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{OUT.relative_to(ROOT)}: sha {sha[:7]}, skills {len(data['skills'])}, agents {len(data['agents'])}, commands {len(data['commands'])}")


if __name__ == "__main__":
    main()
