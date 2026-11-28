#!/usr/bin/env python
"""PreToolUse 가드레일: 비밀/키 파일에 대한 쓰기(Edit/Write/MultiEdit)를 차단.
exit 2 = 차단(사유를 Claude에 전달). 일반 파일은 통과(exit 0).
판정은 파일 이름(basename)만 본다. 이름에 'credential'이 들어간 코드·문서(CredentialService.java,
credentials-guide.md)는 비밀 파일이 아니므로 통과시키고, .env 의 예시본(.env.example 등)도 통과시킨다."""
import sys, json, os, re

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HIGH_RISK = [
    # 인증서·키 저장소
    r"\.pem$", r"\.key$", r"\.p12$", r"\.pfx$", r"\.jks$", r"\.keystore$", r"\.ppk$",
    # SSH 개인키(공개키 .pub 는 통과)
    r"^id_(rsa|dsa|ecdsa|ed25519)(_sk)?$",
    # 자격 증명 파일(AWS ~/.aws/credentials, gcp-credentials.json 등) — 코드 파일 CredentialService.java 는 제외
    r"^credentials?$", r"(^|[._-])credentials?\.(json|ya?ml|txt|xml|ini|csv|env)$",
    r"^\.git-credentials$", r"^\.netrc$", r"^_netrc$",
    # 비밀 값 파일
    r"\.secret", r"secrets?\.(json|ya?ml|txt)$",
    # 환경 변수 파일(.env, .env.local, .env.production …) — 예시본은 제외
    r"^\.env$", r"^\.env\.(?!(example|sample|template|dist|defaults)$).+$",
    # 패키지 레지스트리 토큰
    r"^\.npmrc$", r"^\.pypirc$",
]

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if not isinstance(data, dict):
        sys.exit(0)
    ti = data.get("tool_input") or {}
    path = ti.get("file_path") or ti.get("path") or ""
    if not path:
        sys.exit(0)
    base = os.path.basename(str(path).replace("\\", "/")).lower()
    if any(re.search(p, base) for p in HIGH_RISK):
        sys.stderr.write(
            f"[guard-secrets] '{base}' 은(는) 비밀/키 파일로 보여 쓰기를 막았습니다. "
            f"의도된 변경이면 사람이 직접 편집하거나, core 플러그인의 hooks/guard_secrets.py 에서 예외 처리하세요.\n"
        )
        sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()
