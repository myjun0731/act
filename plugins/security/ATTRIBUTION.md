# 출처 (Attribution)

이 플러그인의 스킬은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)
커밋 `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`에서 선별 내재화한다.

- 각 스킬의 SKILL.md frontmatter `metadata.origin`을 보존한다. `origin`이 `ECC`가 아닌 스킬(community 등)은
  ECC 저장소에 기여된 원 저작자를 아래 목록에 함께 적는다.
- ECC 하네스 전용 참조(커맨드·에이전트·훅·메모리·런타임)를 걷어내거나 "있으면 적용"으로 바꾼 내용은 스킬별로 적는다.
- 재배포 시 본 표기를 유지할 것.

## 가져온 스킬 (W2, 0.1.0)

- security-review(+ references), web-perimeter-owasp-2025-audit, security-bounty-hunter, leanrea, llm-trading-agent-security
- security-bounty-hunter, llm-trading-agent-security — origin `ECC direct-port adaptation`

### 변경한 내용
- leanrea: 최상위 `origin:` → `metadata.origin`.
- 그 외 원본 그대로. `security-review`는 act의 다른 플러그인(core·dev-toolkit·agentic 스킬)이 참조하는 허브 스킬이다 — security를 설치하지 않으면 그 참조는 건너뛴다.

## W5 추가 (0.1.0에 포함)
- security-scan — AgentShield CLI(`ecc-agentshield`, https://github.com/affaan-m/agentshield)로 `.claude/` 설정을 감사한다. ECC 하네스가 아니라 독립 npm 도구라서 남겼고, `npx`가 내려받아 실행한다는 점과 버전 고정 방법을 `> **Requires:**` 줄에 적었다.
