# web3

웹3 스킬: DeFi AMM 보안, EVM 토큰 소수점, keccak256 해시 함정, 예측시장 오라클·리스크 검토. ECC(MIT) 내재화.


```
claude plugin install web3@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install web3@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin web3`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (5)

| 스킬 | 설명 |
|---|---|
| `defi-amm-security` | Security checklist for Solidity AMM contracts, liquidity pools, and swap flows. |
| `evm-token-decimals` | Prevent silent decimal mismatch bugs across EVM chains. |
| `nodejs-keccak256` | Prevent Ethereum hashing bugs in JavaScript and TypeScript. |
| `prediction-market-oracle-research` | Research prediction markets as data sources or oracle signals for products, agents, dashboards, and corporate decision intelligence. |
| `prediction-market-risk-review` | Review prediction-market, basket, oracle, and trading-agent workflows for compliance, safety, data-quality, privacy, and execution risk. |
<!-- inventory:end -->
