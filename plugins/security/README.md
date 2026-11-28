# security

보안 스킬: 보안 리뷰 체크리스트, OWASP Top 10:2025 외곽 진단, 버그바운티 헌팅, 리버스 엔지니어링, 트레이딩 에이전트 보안, 설정 보안 스캔. ECC(MIT) 내재화.


```
claude plugin install security@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install security@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin security`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (6)

| 스킬 | 설명 |
|---|---|
| `leanrea` | Reverse engineers shipped software with bounded local CLI inspection. |
| `llm-trading-agent-security` | Security patterns for autonomous trading agents with wallet or transaction authority. |
| `security-bounty-hunter` | Hunt for exploitable, bounty-worthy security issues in repositories. |
| `security-review` | Security review checklist and patterns for adding authentication, handling user input, managing secrets, creating API endpoints, or implementing paym… |
| `security-scan` | Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. |
| `web-perimeter-owasp-2025-audit` | Passive, non-destructive web perimeter security auditing mapped to OWASP Top 10:2025 surface leads, CDN Unkeyed Header Web Cache Poisoning (X-Forward… |
<!-- inventory:end -->
