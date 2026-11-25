export const meta = {
  name: 'db-diff',
  description: '2개 이상 DB의 정규 스키마 스냅샷(계약)을 받아 스키마·방언 차이를 다차원 분석하고, 각 지적을 반박 검증한 뒤 심각도순 이관 관점 리포트로 합친다. DB에 직접 접속하지 않는 읽기 전용 워크플로.',
  whenToUse: '이관 준비·운영 원본 대조·방언(MariaDB↔PostgreSQL 등) 전환 검증에서 두 DB의 구조 차이를 분석할 때. 입력(args): 스냅샷 2개 이상(파일 경로 또는 인라인 JSON) + 선택 범위(scope). 스냅샷이 없으면 읽기 전용 information_schema 조회 지시서를 출력하고 종료 → 외부 DB 조회 도구로 떠서 재투입. 실제 접속·권위 있는 이관함정 판정은 도메인 플러그인 몫. 데이터 프로파일 diff는 2차 범위(별도 집계 계약).',
  phases: [
    { title: '수집', detail: '스냅샷을 정규 계약으로 정규화·검증(비밀/행값 필드 거부). 2개 미만이면 조회 지시서 출력 후 종료' },
    { title: '차이분석', detail: '기준선 대비 쌍별로 스키마·방언 차원 병렬 분석' },
    { title: '검증', detail: '각 차이 지적을 독립 반박으로 검증(노이즈 제거)' },
    { title: '리포트', detail: '확인된 차이를 심각도순 이관 리포트+ADR로 합성' },
  ],
}

// 이 워크플로는 DB에 접속하지 않는다. "정규 스키마 스냅샷 계약"만 소비한다(설계: docs/design/db-diff.md).
// 계약에는 접속정보·실제 행값이 존재하지 않는다 → 기밀 유출 경로를 설계로 차단한다.
// DB 리뷰 에이전트(database-architect·sql-pro)를 차원별 워커로 디스패치한다.

const COLLECT_SCHEMA = {
  type: 'object',
  required: ['snapshots'],
  properties: {
    snapshots: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'dialect', 'tables'],
        properties: {
          label: { type: 'string' },
          dialect: { type: 'string' },
          scope: { type: 'object' },
          tables: { type: 'array' },
        },
      },
    },
    needsSnapshot: { type: 'boolean' },
    instructions: { type: 'string' },
    provenance: { type: 'array', items: { type: 'string' } },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['object', 'severity', 'summary'],
        properties: {
          object: { type: 'string' }, // 테이블 또는 테이블.컬럼
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string' }, // schema | dialect
          summary: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}

// 계약에 있어선 안 되는 키(접속정보·행값). 스키마 구조 외 데이터가 리포트로 새지 않도록 JS측에서 결정적으로 거부한다.
const FORBIDDEN_KEYS = [
  'host', 'port', 'user', 'username', 'password', 'pwd', 'secret',
  'connectionstring', 'connstr', 'dsn', 'jdbcurl', 'url',
  'rows', 'data', 'values', 'samplerows', 'sampledata', 'sample',
]

function forbiddenHits(node, path, out) {
  if (node && typeof node === 'object') {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) forbiddenHits(node[i], path + '[' + i + ']', out)
    } else {
      for (const k of Object.keys(node)) {
        if (FORBIDDEN_KEYS.indexOf(String(k).toLowerCase()) !== -1) out.push(path + '.' + k)
        forbiddenHits(node[k], path + '.' + k, out)
      }
    }
  }
  return out
}

const rawArgs = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object') ? JSON.stringify(args) : ''

// 1) 수집 -----------------------------------------------------------------
phase('수집')
const collected = await agent(
  '다음 입력에서 비교할 DB 스냅샷을 수집·정규화하라.\n입력(args): ' + (rawArgs || '(없음)') + '\n\n' +
    '규칙:\n' +
    '① 입력이 스냅샷 파일 경로면 읽고, 인라인 JSON/DDL이면 파싱해 "정규 스키마 계약"으로 변환한다. ' +
    '계약 형태: { label, dialect, scope:{schema,tableGlob}, tables:[{ name, columns:[{name, rawType, normType, nullable, default, ordinal}], primaryKey:[...], foreignKeys:[...], indexes:[...], constraints:[...] }] }. ' +
    'rawType(원본 타입 문자열)와 normType(방언 중립 정규 타입)을 모두 채운다.\n' +
    '② 보안(최우선): host·port·user·password·connectionString·DSN·실제 행값/데이터/샘플을 계약에 **절대 넣지 마라**. 스키마 구조만. label은 DSN/호스트가 아니라 db-targets.json 류의 불투명 논리명이어야 한다.\n' +
    '③ 유효 스냅샷이 2개 미만이면 needsSnapshot=true로 두고, instructions에 각 방언별 **읽기 전용** 조회 지시서(information_schema.columns·table_constraints·key_column_usage·statistics, PostgreSQL은 pg_indexes 등 — 쓰기 0)를 적어라. 사용자가 외부 DB 조회 도구로 실행해 결과를 재투입하면 2회차에 분석한다. 이 워크플로는 DB에 직접 접속하지 않는다.\n' +
    '④ provenance(각 스냅샷의 출처·시점 라벨, 비밀 아님)가 입력에 있으면 보존하라.',
  { schema: COLLECT_SCHEMA, effort: 'low', label: '스냅샷 수집' },
)

// JS측 보안 가드: 금지 키가 섞인 스냅샷은 분석에서 제외(결정적)
const rawSnaps = (collected && Array.isArray(collected.snapshots)) ? collected.snapshots : []
const snapshots = []
const rejected = []
for (const s of rawSnaps) {
  const hits = forbiddenHits(s, (s && s.label) ? String(s.label) : 'snapshot', [])
  if (hits.length) rejected.push({ label: s && s.label, keys: hits.slice(0, 8) })
  else if (s && s.label && s.dialect && Array.isArray(s.tables)) snapshots.push(s)
}
if (rejected.length) log('⚠ 금지 키(접속정보/행값)로 제외된 스냅샷 ' + rejected.length + '건')
log('유효 스냅샷 ' + snapshots.length + '개')

if (snapshots.length < 2) {
  return {
    note: snapshots.length + '개 스냅샷만 확보됨 — 비교하려면 2개 이상 필요합니다. 아래 조회 지시서를 외부 DB 조회 도구로 실행해 스냅샷을 떠서 재투입하세요(읽기 전용, DB 직접 접속 없음).',
    needsSnapshot: true,
    instructions: (collected && collected.instructions)
      ? collected.instructions
      : '수집 에이전트가 조회 지시서를 생성하지 못했습니다. 각 DB의 information_schema(columns·table_constraints·key_column_usage·statistics)를 읽기 전용으로 덤프해 재투입해 주세요.',
    rejected: rejected,
  }
}

// 기준선 대비 쌍 구성 (N>2는 snapshots[0] 기준 pairwise)
const base = snapshots[0]
const pairs = snapshots.slice(1).map((other) => ({ base: base, other: other }))

function dimsFor(src, tgt) {
  return [
    {
      key: 'schema',
      agentType: 'dev-toolkit:database-architect',
      ask: '두 스냅샷의 스키마 차이를 분석하라: 테이블 존재/누락, 컬럼 집합·타입·NULL 허용·기본값·PK/FK·인덱스·제약의 차이. 데이터 손실/비호환 위험(타입 축소, NOT NULL 신설, PK 변경 등)을 심각도에 반영하라. postgresql-table-design 스킬 지침이 있으면 적용하라.',
    },
    {
      key: 'dialect',
      agentType: 'dev-toolkit:sql-pro',
      ask: '방언 차이를 분석하라(' + src + ' → ' + tgt + '): 타입 매핑(varchar/number ↔ text/numeric 등)의 등가/비호환, 함수·문법·캐스트 차이, 식별자 대소문자 처리. rawType와 normType을 함께 보고 "표기만 다름"과 "의미가 다름"을 구분하라. MariaDB→PostgreSQL이면 정수 컬럼 setString 타입오류, varchar(n) 일시 컬럼 캐스트, date_format·substring_index 등 함수 차이를 후보로 점검하라(권위 있는 이관함정 판정은 도메인 플러그인에 위임 — 여기선 후보만 제시). postgres-patterns·mysql-patterns 스킬 지침이 있으면 적용하라.',
    },
  ]
}

// 2) 차이분석 → 3) 검증 (파이프라인: 단계 간 배리어 없음) ------------------
const perPair = await pipeline(
  pairs,
  // 차이분석: 쌍마다 차원들을 동시에
  async (pair) => {
    const dims = dimsFor(pair.base.dialect, pair.other.dialect)
    const payload = JSON.stringify({ base: pair.base, other: pair.other })
    const results = await parallel(
      dims.map((d) => async () => {
        const out = await agent(
          '기준선 "' + pair.base.label + '" 와 대상 "' + pair.other.label + '" 의 정규 스키마 스냅샷(JSON)을 ' + d.ask + '\n' +
            "발견한 차이만 findings로 반환하고(object=테이블 또는 테이블.컬럼, category='" + d.key + "'), 차이가 없으면 빈 배열을 반환하라. 구조 차이만 다루고 실제 데이터 값은 쓰지 마라.\n\n" +
            payload,
          { agentType: d.agentType, schema: FINDINGS_SCHEMA, phase: '차이분석', label: '분석:' + d.key + ':' + pair.other.label },
        )
        const fs = (out && Array.isArray(out.findings)) ? out.findings : []
        return fs.map((f) => Object.assign({ base: pair.base.label, other: pair.other.label }, f))
      }),
    )
    return { pair: pair, findings: results.filter(Boolean).flat() }
  },
  // 검증: 각 차이 지적을 독립 반박
  async (analyzed) => {
    const fs = analyzed.findings
    if (!fs.length) return []
    const verified = await parallel(
      fs.map((f) => async () => {
        const v = await agent(
          '다음 DB 구조 차이 지적을 반박하라. 방언 등가라 "표기만 다름"이거나 collation·식별자 대소문자·벤더 기본값 같은 노이즈면 real=false. 재현 안 되거나 근거가 약하면 real=false. 확신이 없으면 real=false로 기운다.\n' +
            '대상: ' + f.base + ' vs ' + f.other + ' / 객체: ' + (f.object || '') + '\n분류: ' + (f.category || '') + ' / 심각도: ' + f.severity + '\n지적: ' + f.summary + '\n상세: ' + (f.detail || ''),
          { schema: VERDICT_SCHEMA, phase: '검증', label: '검증:' + (f.object || f.other) },
        )
        return (v && v.real) ? f : null
      }),
    )
    return verified.filter(Boolean)
  },
)

const confirmed = perPair.flat().filter(Boolean)
log('확인된 차이 ' + confirmed.length + '건')

// 4) 리포트 ---------------------------------------------------------------
phase('리포트')
const reportMeta = {
  baseline: base.label,
  targets: snapshots.slice(1).map((s) => s.label),
  provenance: (collected && Array.isArray(collected.provenance)) ? collected.provenance : [],
  rejected: rejected,
}
const report = await agent(
  '다음은 DB 스냅샷 비교에서 검증을 통과한 구조 차이 목록(JSON)과 메타다. 심각도(데이터손실/비호환=high → 함수/캐스트=medium → 경미=low)·대상·차원(category)별로 묶어 한국어 마크다운 "DB 구조 diff 리포트"를 작성하라. ' +
    '구성: ① 요약(기준선·대상·범위·provenance; 차이가 없으면 통과(PASS) 명시), ② 심각도순 차이 표(대상 · object · 분류 · 심각도 · 요약 · 권고), ③ 이관 관점 결정 기록(ADR: 맥락·대안·결정·영향 — 데이터 손실/비호환을 어떻게 다룰지). ' +
    '구조 차이만 쓰고 실제 데이터 값은 넣지 마라. 접속정보·내부 IP·DSN을 출력하지 마라. 금지 키로 제외된 스냅샷(rejected)이 있으면 리포트 상단에 경고로 명시하라.\n\n' +
    JSON.stringify({ meta: reportMeta, findings: confirmed }),
  { agentType: 'dev-toolkit:database-architect', label: 'diff 리포트' },
)
return report
