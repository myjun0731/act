#!/usr/bin/env python
"""PreToolUse 가드레일: 비밀/키 파일에 대한 쓰기(Edit/Write/MultiEdit)를 차단.
exit 2 = 차단(사유를 Claude에 전달). 일반 파일은 통과(exit 0).
판정은 파일 이름(basename)만 본다. 이름을 정규화한 뒤 검사한다 — Windows 는 끝의 점·공백과
':스트림' 접미사(.env::$DATA)를 같은 파일로 열기 때문에, 정규화하지 않으면 `.env.`·`id_rsa ` 로 우회된다.
이름에 'credential'이 들어간 코드·문서(CredentialService.java, credentials-guide.md)는 비밀 파일이 아니므로
통과시키고, .env 의 예시본(.env.example 등)과 SSH 공개키(.pub)도 통과시킨다."""
import sys, json, os, re

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# 이름에 credential 이 들어가도 비밀 파일이 아닌 코드·문서 확장자
CODE_DOC_EXT = {
    "py", "js", "jsx", "ts", "tsx", "mjs", "cjs", "java", "kt", "kts", "scala", "groovy", "go", "rs", "rb",
    "php", "cs", "fs", "vb", "swift", "m", "mm", "c", "h", "cc", "cpp", "hpp", "dart", "lua", "pl", "sh",
    "ps1", "sql", "vue", "svelte", "html", "css", "scss", "md", "mdx", "rst", "adoc",
}

HIGH_RISK = [
    # 인증서·키 저장소
    r"\.pem$", r"\.key$", r"\.p12$", r"\.pfx$", r"\.jks$", r"\.keystore$", r"\.ppk$",
    # SSH 개인키와 그 사본(id_rsa.bak, id_ed25519_old …). 공개키 .pub 는 아래 is_secret 에서 제외
    r"^id_(rsa|dsa|ecdsa|ed25519)",
    # 자격 증명 파일 형태(.git-credentials, .netrc)
    r"^\.git-credentials", r"^[._]netrc$",
    # 비밀 값 파일
    r"\.secret", r"secrets?\.(json|ya?ml|txt)$",
    # 환경 변수 파일(.env, .env.local, .env.production …) — 예시본은 제외
    r"^\.env$", r"^\.env\.(?!(example|sample|template|dist|defaults)$).+$",
    # 패키지 레지스트리 토큰
    r"^\.npmrc$", r"^\.pypirc$",
]
# 'credentials' 토큰(단독 이름, 또는 _ - . 로 구분된 토큰) — 코드·문서 확장자면 통과
CRED_TOKEN = re.compile(r"(^|[._-])credentials?($|[._-])")


def normalize(path):
    base = os.path.basename(str(path).replace("\\", "/"))
    base = base.split(":", 1)[0]          # NTFS 대체 데이터 스트림(.env::$DATA, id_rsa:x)
    base = base.rstrip(" .")              # Windows 가 무시하는 끝의 점·공백(.env. / id_rsa )
    return base.lower()


def is_secret(base):
    if not base:
        return False
    if base.startswith("id_") and base.endswith(".pub"):
        return False
    if any(re.search(p, base) for p in HIGH_RISK):
        return True
    if CRED_TOKEN.search(base):
        ext = base.rsplit(".", 1)[1] if "." in base.lstrip(".") else ""
        return ext not in CODE_DOC_EXT
    return False


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
    raw = os.path.basename(str(path).replace("\\", "/")).lower()
    base = normalize(path)
    # 정규화 전·후 이름 중 하나라도 비밀 파일이면 막는다
    if is_secret(base) or is_secret(raw):
        sys.stderr.write(
            f"[guard-secrets] '{base or raw}' 은(는) 비밀/키 파일로 보여 쓰기를 막았습니다. "
            f"의도된 변경이면 사람이 직접 편집하거나, core 플러그인의 hooks/guard_secrets.py 에서 예외 처리하세요.\n"
        )
        sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()
