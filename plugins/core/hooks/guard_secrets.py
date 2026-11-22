#!/usr/bin/env python
"""PreToolUse 가드레일: 비밀/키 파일에 대한 쓰기(Edit/Write/MultiEdit)를 차단.
exit 2 = 차단(사유를 Claude에 전달). 일반 파일은 통과(exit 0)."""
import sys, json, os, re

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HIGH_RISK = [
    r"\.pem$", r"\.key$", r"\.p12$", r"\.pfx$", r"\.jks$", r"\.keystore$",
    r"id_rsa", r"id_ed25519", r"\.ppk$",
    r"credential", r"\.secret", r"secrets?\.(json|ya?ml|txt)$",
    r"\.npmrc$", r"\.pypirc$",
]

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    ti = data.get("tool_input") or {}
    path = ti.get("file_path") or ti.get("path") or ""
    if not path:
        sys.exit(0)
    base = os.path.basename(path).lower()
    if any(re.search(p, base) for p in HIGH_RISK):
        sys.stderr.write(
            f"[guard-secrets] '{base}' 은(는) 비밀/키 파일로 보여 쓰기를 막았습니다. "
            f"의도된 변경이면 사람이 직접 편집하거나, core 플러그인의 hooks/guard_secrets.py 에서 예외 처리하세요.\n"
        )
        sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()
