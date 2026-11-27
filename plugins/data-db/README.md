# data-db

데이터·DB 스킬: ClickHouse·Redis 패턴. 관계형 DB(PostgreSQL·MySQL·MyBatis·JPA)는 dev-toolkit에 있다. ECC(MIT) 내재화.


- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install data-db@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin data-db`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.
