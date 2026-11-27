# db-diff 설계안 (dev-toolkit 신규 동적 워크플로)

> 출처: `dev-toolkit:design-approaches` 워크플로 산출(16 에이전트·3접근안×4렌즈 심사→합성).
> 상태: **설계 확정, 구현 전**. 이 문서는 `db-diff.js` 구현의 설계 근거(ADR)다.
> 2개 이상 DB 타깃의 **구조 차이**를 읽기전용으로 분석하는 워크플로. 이관 준비·운영 원본 대조·방언 전환 검증용.

---

## ① 추천 설계 — 스냅샷 계약 기반 포트·어댑터

핵심 재정의: **"DB 2개를 연결해 비교"가 아니라 "DB 2개의 정규 스냅샷(계약)을 비교"** 한다. 이 한 줄이 보안·위임 경계·테스트성을 동시에 해결한다.

### 1. 위치·형태
- `plugins/dev-toolkit/workflows/db-diff.js` — 제네릭 골격만. 실제 접속·조회·권위 있는 함정 판정은 외부(외부 DB 조회 도구·도메인 플러그인)에 위임.
- **리프 전용**(내부에서 `workflow()` 호출 안 함) → 중첩 1단 제약 충족 → migration-readiness가 db-diff를 리프로 물릴 수 있음.
- `workflows/README.md` 표에 한 줄 추가.

### 2. 경계 아티팩트 — 정규 스키마 스냅샷 계약 (contract-first, 유일 입력)
타깃당 하나의 머신체크 가능 JSON. db-diff가 소비하는 **유일한** 입력 형태:
```
{ label, dialect, scope:{schema, tableGlob},
  tables:[{ name,
    columns:[{name, rawType, normType, nullable, default, ordinal}],
    primaryKey:[...], foreignKeys:[{columns,refTable,refColumns}],
    indexes:[{name,columns,unique}], constraints:[{name,kind,expr}] }] }
```
- 계약에 **host·port·user·password·connectionString·실제 행값 필드가 아예 존재하지 않는다** → 비밀/IP/고객데이터가 리포트로 샐 구조 자체가 없음(보안이 설계로 보장).
- `label`은 DSN이 아니라 db-targets.json의 **불투명 논리명**(예: `mariadb-legacy-6`).
- 방언 손실 방지를 위해 `rawType`(원본 타입 문자열)과 `normType`(방언 중립 정규 타입)을 **둘 다** 보존.

### 3. 아웃바운드 포트 = DatabaseIntrospectionPort, 어댑터 3종
db-diff는 "label에 대한 정규 스냅샷을 공급받는다"는 포트에만 의존:
- **(a) provided** — 이미 덤프된 스냅샷/DDL JSON을 args/파일로 받아 정규화(기본).
- **(b) instructed** — 스냅샷이 없으면 방언별 **읽기전용 조회 지시서**(`SELECT ... FROM information_schema.{columns,table_constraints,key_column_usage,statistics}` 세트, 쓰기 0)를 출력하고 `needs snapshot`으로 조기 종료. 사용자가 외부 DB 조회 도구 `/dbq`로 실행 후 결과를 재투입 → 2회차에 분석. **db-diff는 외부 DB 조회 도구를 직접 호출하지 않는다.**
- **(c) 도메인 고유 어댑터** — 도메인 플러그인 몫. act엔 (a)(b) 제네릭 골격만.

→ 위임 경계가 "포트 계약 1개"로 깔끔히 떨어진다.

### 4. 흐름 (기존 sql-db-audit 골격 재사용: 수집→팬아웃→반박→합성)
1. **수집** (`phase '수집'`, effort:'low', 기계적): args 파싱(문자열 `"A vs B, 스키마 public"` 또는 객체 `{targets, scope, options}`). 공급 스냅샷을 정규 계약으로 변환해 2개 이상 확보. 없으면 instructed 어댑터 출력 후 종료. **계약 위반(비밀/행값 필드 포함) 스냅샷은 거부.**
2. **다차원 팬아웃** (`parallel`): N>2는 `targets[0]`=기준선으로 pairwise. 차원은 상단 레지스트리로 데이터화:
   - `schema` → agentType **database-architect**: 테이블 존재/누락, 컬럼집합·타입·NULL·기본값·PK/FK·인덱스·제약 차이. postgresql-table-design 스킬.
   - `dialect` → agentType **sql-pro**: 타입 매핑(varchar/number↔text/numeric), 함수·문법·캐스트·식별자 대소문자. `(source→target)` **방언 규칙팩** 참조 — mariadb→postgresql 팩에 정수 setString·varchar(n) 일시 캐스트·date_format·substring_index 트랩 포함. **후보만 표시**, 권위 판정은 /pg-trap·/mapper-check에 위임.
   - `data_profile` → agentType **database-optimizer**, `options.dataProfile===true`일 때만: 행수·NULL비율·값 도메인. **집계·버킷만, 샘플 마스킹·개수 상한.** 기본 off.
3. **반박 검증** (`parallel`): 각 지적 독립 반박. collation·식별자 대소문자·벤더 기본 인덱스 등 노이즈면 `real=false`. VERDICT 스키마 `{real, reason}` 그대로.
4. **합성** (`phase '합성'`, agentType database-architect): 심각도순(데이터손실>타입비호환>함수/캐스트>경미) 한국어 마크다운 diff 리포트 + **이관 ADR**(맥락·대안·결정·영향). architecture-decision-records 스킬. 구조 차이만, 데이터 값 마스킹. 차이 없으면 PASS 명시. ADR 파일 실제 생성은 사용자 승인 후.

### 5. 추천 근거 (심사 렌즈별)
- **이관 적합성/완전성**: 방언 규칙팩 + 레지스트리로 oracle→tibero 등 새 조합을 설정만으로 증설(open-closed). 메이저 버전 업그레이드·MariaDB→PG 이관 업무에 직결.
- **보안(최우선)**: 계약에 비밀/IP/행값 필드가 **구조적으로 부재** → 유출 경로가 닫힘. 세 안 중 가장 강한 보장.
- **외부 DB 조회 도구 위임 경계**: 포트 계약 1개로 명확. 실행 수단을 코어에 두지 않음.
- **migration-readiness 연계**: findings 형태를 sql-db-audit·migration-verify와 정렬 → `LEAVES`에 `'db-diff'` 한 줄 추가로 합류.
- **단순성**: 리프 전용이라 중첩 1단 자연 충족, 기존 골격 재사용.

---

## ② 다른 접근안에서 접목할 아이디어

- **(risk 안) 실패 격리**: 한 타깃 스냅샷 누락 시 그 타깃만 "미수집"으로 표기하고 나머지 쌍 대조는 진행. A-vs-B 실패가 A-vs-C를 오염시키지 않도록 **쌍 단위 격리**.
- **(risk 안) provenance 라벨**: 두 스냅샷을 다른 시점에 뜬 경우의 "유령 diff" 방지용으로, 비밀이 아닌 출처·시각 라벨을 args로 받아 리포트에 명시(없으면 경고). Date.now() 금지 제약과도 양립.
- **(risk 안) rawType 기준 2차 판정**: 과도 정규화로 방언 특화 차이가 가려지지 않게, dialect diff는 normType뿐 아니라 **rawType 기준으로도** 본다.
- **(risk 안) 완전성 1회 보강**: migration-verify 패턴처럼 반박 후 "미점검 함정"을 비평가가 1회 보강 → false negative(이관함정 누락) 방지.
- **(mvp 안) 2회차 왕복 안내**: instructed 경로에서 사용자가 재투입을 잊지 않도록 `note`로 "다음 단계(외부 DB 조회 도구 실행 후 재호출)" 명확 안내.
- **(mvp 안) 스냅샷 출처·scope를 리포트에 기록**: 신선도 불일치를 사람이 판단할 수 있게.

---

## ③ 트레이드오프·위험·완화

### 트레이드오프 (의식적 포기)
- **즉시성 포기**: 라이브 커넥터 대비 "스냅샷 먼저 뜨기" 핸드오프 1스텝 추가. → 재현성·감사가능성·보안을 얻음. instructed 어댑터가 ready-to-run 쿼리를 제공해 완화.
- **계약 스키마 유지 비용**: information_schema 방언차를 정규화하는 매핑 테이블 관리 필요. → 매핑 지식은 이미 postgres/mysql-patterns 스킬에 존재, normType+rawType 동시 보존으로 손실 방지.
- **초기 2곳 작업**: act엔 골격만, 실사용엔 도메인 플러그인 어댑터 구현 필요.
- **N개 비교 단순화**: 기준선 대비 pairwise만, 3자 교차 매트릭스 미지원(이관 실무엔 충분).

### 위험·완화
| 위험 | 완화 |
|---|---|
| 스냅샷에 연결정보/행값 혼입 | 수집 단계에서 계약 위반 스냅샷 **거부**(스키마 검증), 금지 필드 화이트리스트 밖 드롭, 리포트 레이어 2차 스크럽 |
| data_profile 실수 ON으로 고객 데이터 유출 | 기본 off, 집계/버킷만, 원시 행 금지, 샘플 마스킹, 리포트에 "데이터 프로파일 포함" 경고 배지 |
| label에 DSN/호스트 오기입 | label은 db-targets.json 논리명만 허용 명시, 호스트/IP 패턴 감지 시 경고 |
| information_schema 방언차로 거짓 diff | dialect 차원이 "매핑 등가"를 먼저 판정해 표기 차이와 의미 차이 분리, 반박 단계가 약한 지적 제거 |
| 오탐(collation·대소문자·벤더 기본값) | 검증 단계 노이즈 반박, 확신 없으면 real=false로 기움 |
| 스냅샷 시점 불일치 → 유령 diff | provenance 라벨·scope 리포트 기록 |
| 2회차 왕복 미완료 | note로 외부 DB 조회 도구 실행 후 재호출 안내 |
| 방언 규칙팩이 도메인 이관함정 검사와 중복·드리프트 | db-diff 팩은 "구조·타입 매핑" 수준만, 매퍼 SQL 레벨 트랩은 도메인 플러그인 위임을 경계 문서화 |
| db-targets.json·스냅샷 외부 반출 | 로컬 전용·커밋 금지 규칙을 리포트 헤더·조회 지시 블록에 명기 |
| 범위 글롭 과다 → 토큰 폭증 | scope 기본 좁게(명시 권장), 수집 effort:'low', 설치규모 medium/large 안내 |

---

## ④ 결정 기록 (ADR)

### ADR-001: db-diff는 DB에 접속하지 않고 정규 스냅샷 계약만 소비한다
- **맥락**: 메이저 버전 업그레이드, MariaDB→PG 방언 전환, 운영 원본 대조가 반복 업무. 두 DB 구조 차이를 분석하는 도구가 공백. 그러나 act dev-toolkit은 제네릭·공개 배포 경계, 접속정보·고객데이터는 평문 반입 금지(최우선 보안).
- **대안**: (A) 라이브 커넥터 내장 — 빠르나 쓰기 위험·접속정보 act 반입·실패 전파. (B) 외부 DB 조회 도구가 diff까지 수행 — 제네릭 재사용성 상실. (C) 코드/매퍼만 비교(기존 sql-db-audit) — DB 인스턴스 대조 공백 미해소.
- **결정**: (A)(B)(C) 기각. **스냅샷 계약 기반 포트·어댑터**를 채택하되 risk 안의 실패 격리·provenance·완전성 보강을 흡수. db-diff는 접속 코드를 갖지 않고 provided/instructed 어댑터로만 스냅샷을 얻는다.
- **영향**:
  - 긍정 — 라이브 핸들 부재로 **쓰기가 구조적으로 불가능**(읽기전용이 규율 아닌 구조 보장). 비밀/IP/행값 필드 부재로 유출 표면 원천 축소. 접속 없이 샘플 JSON으로 테스트 가능. 차원·방언팩 증설이 설정만으로.
  - 부정 — 스냅샷 선행의 2단계 핸드오프(수동 왕복), 계약 정규화 매핑 유지 비용, 도메인 어댑터 별도 구현.
  - 이관 관점 — migration-readiness `LEAVES`에 리프로 합류, 리포트에 "스키마/방언 구조 차이(db-diff)" 편입. 롤백 불필요(읽기전용·비파괴).

### ADR-002: 데이터 프로파일 diff는 기본 off 옵트인
- **맥락**: 행수·NULL비율·값 분포는 이관 검증에 유용하나 비용이 크고 고객 데이터 기밀 민감.
- **결정**: `options.dataProfile` 토글, 기본 false, 켜도 **집계·버킷·마스킹만**, 원시 행 반환 금지.
- **영향**: 기본 경로가 안전·저렴. 분포 차이 분석은 의도적·가역 토글로만. 리포트에 경고 배지.

### DSL 준수 체크
`export const meta` 리터럴 맨 앞 · 평범한 JS · `Date.now()`/`Math.random()`/`new Date()` 미사용(시점 필요 시 provenance 라벨을 args로) · phase/agent/parallel/pipeline/log만 사용 · 내부 `workflow()` 호출 없음(리프 고정) · agentType: database-architect·database-optimizer·sql-pro.

### 참고 구현체 (구현 시 대조)
- `plugins/dev-toolkit/workflows/sql-db-audit.js` — 팬아웃·검증·리포트 골격, FINDINGS/VERDICT 스키마
- `plugins/dev-toolkit/workflows/migration-verify.js` — 완전성 루프·반박 verify 헬퍼
- `plugins/dev-toolkit/workflows/migration-readiness.js` — 리프 합성, `LEAVES` 추가 지점
- 신규: `plugins/dev-toolkit/workflows/db-diff.js` (+ `workflows/README.md` 표 한 줄)

---

## 구현 체크리스트 (다음 단계)
- [ ] `plugins/dev-toolkit/workflows/db-diff.js` — 위 흐름(수집→팬아웃→반박→합성), 스냅샷 계약 검증(금지 필드 거부), 방언 규칙팩 레지스트리, data_profile 옵트인.
- [ ] `workflows/README.md` 리프 표에 db-diff 한 줄 + SDLC 매핑.
- [ ] `migration-readiness.js` `LEAVES`에 `'db-diff'` 합류(선택).
- [ ] 도메인 고유 어댑터(instructed 조회 실행)는 도메인 플러그인/외부 DB 조회 도구 쪽에서.
- [ ] `check_refs`/`node --check` 통과 확인 후 dev 시드.

---

## 검증 메모 (구현 전, 코드베이스 대조)

판정: **구현 가능** — 결함 1건은 1차 범위에서 제외해 해소.

**실측 확인**
- agentType(database-architect·database-optimizer·sql-pro), 스킬 7종, 골격 워크플로(sql-db-audit·migration-verify·migration-readiness) 모두 실재.
- DSL 제약 준수(meta 선두·`Date.now()` 미사용·리프 전용). 구현 시 agentType·스킬 참조가 전부 해석 → check_refs 녹색 유지.
- migration-readiness는 args를 가공 없이 각 리프에 그대로 전달(`runLeaf(n, args)`, migration-readiness.js:25) → 복합 args 객체면 db-diff 합류 가능.

**해소 필요**
1. **[결함] ADR-001 ↔ ADR-002 모순**: 스키마 계약은 데이터 필드를 구조적으로 배제하는데 data_profile은 집계 데이터를 요구 → 스키마 계약만으로 불가. **→ 1차 범위에서 data_profile 제외**, 2차에 별도 "집계 프로파일 계약"(비밀·원시행 없는) 정의 후 추가.

**보완(블로커 아님)**
2. migration-readiness 합류는 코드상 "한 줄"이나, 호출자가 복합 args(`{target, targets, scope}`)를 줘야 하고 db-diff는 DB 타깃 없을 때 조용히 미수집 조기종료해야 함(구현 반영).
3. normType 정규화는 산문 스킬 기반 LLM 판단(결정적 매핑 아님) → 방언 diff는 자문, 반박 검증이 거름. 기대치 명시.
4. instructed 2회차는 수동 왕복(워크플로가 외부 DB 조회 도구를 직접 못 부름) → 재투입 `note` 필수.

**1차 구현 범위(확정)**: 스키마 diff + 방언 diff(provided/instructed 어댑터). 보안은 **허용목록 투영**(계약 외 필드 전부 폐기 — 데니리스트 우회 불가) + **간접 프롬프트 주입 방어**(스냅샷을 신뢰불가 데이터 delimit 블록으로, 라벨 strict charset 제한)로 구현. data_profile·도메인 어댑터·migration-readiness 합류는 후속.

> 보안 리뷰 반영(security-guidance): ① 데니리스트→허용목록 투영 교체, ② 외부 DB 식별자의 프롬프트 주입 방어, ③ 데이터 블록 구분자 위조 방지. 셋 다 "보안 최우선" 설계 의도와 일치.

## 구현 노트 (1차·2차 완료 상태)

- **1차 재설계**: 스모크 테스트에서 "fan-out→적대적 verify" 패턴이 **구조 diff엔 부적합**(진짜 차이를 삭제; tinyint→boolean을 "표준 등가"로 오판 삭제)임이 드러나, **결정적 계산(computeDiffs) + 에이전트 분류(삭제 불가) + 백필**로 재설계. verify 제거. 방언 등가 노이즈는 삭제 않고 low "방언 등가"로 표시. 최종 스모크 11건 전수 포착, 3에이전트로 더 정확·저렴.
- **2차 구현**: ADR-002의 모순(스키마 계약↔데이터)을 **별도 "집계 계약"**(`args.profiles`: label·tables[rowCount, columns[nullRatio, distinctCount]] — 값 없는 집계만, 허용목록 투영으로 min/max/샘플 폐기)으로 해소. `options.dataProfile=true` opt-in, `computeProfileDiffs` 결정적 계산 + `database-optimizer` 분류. **migration-readiness LEAVES에 db-diff 합류**(복합 args로 스냅샷 제공 시 실제 비교, 아니면 "스냅샷 필요" 안내).
- **후속(act 범위 밖)**: 실제 DB 접속·조회 실행 어댑터는 **도메인 플러그인** 몫(보안·배포 경계상 act엔 instructed 지시서 생성까지만). N자 교차 매트릭스, 방언 규칙팩 외부화는 선택.
