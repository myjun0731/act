export const meta = {
  name: 'codebase-map',
  description: '대상을 하위 영역으로 구획하고 영역별로 병렬 리더가 읽어 구조를 요약한 뒤, 아키텍트가 하나의 아키텍처 맵으로 통합한다',
  whenToUse: '모듈·기능·레포의 구조를 빠르게 파악(온보딩)할 때. 입력(args)으로 경로·모듈을 넘기면 그 범위, 없으면 레포 전체.',
  phases: [
    { title: '구획', detail: '대상을 하위 영역으로 분할' },
    { title: '분석', detail: '영역별 병렬 리더가 구조 요약' },
    { title: '통합', detail: '아키텍처 맵으로 합성' },
  ],
}

const AREAS_SCHEMA = {
  type: 'object',
  required: ['areas'],
  properties: {
    areas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const AREA_SCHEMA = {
  type: 'object',
  required: ['name', 'responsibilities'],
  properties: {
    name: { type: 'string' },
    responsibilities: { type: 'string' },
    keyFiles: { type: 'array', items: { type: 'string' } },
    entryPoints: { type: 'array', items: { type: 'string' } },
    dependencies: { type: 'array', items: { type: 'string' } },
  },
}

const target = (typeof args === 'string' && args.trim())
  ? args.trim()
  : (args && typeof args === 'object' && args.target) ? String(args.target).trim() : ''

// 1) 구획 -----------------------------------------------------------------
phase('구획')
const scopeText = target ? `대상: ${target}` : '대상: 레포 전체'
const parted = await agent(
  `${scopeText}\n코드베이스를 하위 영역(계층·모듈: 예 컨트롤러·서비스·매퍼/DAO·도메인·설정·프론트 등)으로 구획하라. ` +
    '각 영역에 name 과 대표 paths 를 담아 areas 로 반환하라. 너무 잘게 쪼개지 말고 8개 이내로.',
  { schema: AREAS_SCHEMA, model: 'haiku', effort: 'low', label: '영역 구획' },
)
let areas = (parted && Array.isArray(parted.areas)) ? parted.areas : []
if (areas.length > 8) areas = areas.slice(0, 8)
log(`영역 ${areas.length}개 구획`)
if (!areas.length) return { note: '구획할 영역을 찾지 못했습니다.' }

// 2) 분석 (병렬 리더, 배리어: 통합은 모든 영역 요약이 필요) -----------------
phase('분석')
const summaries = (await parallel(
  areas.map((ar) => async () => {
    const paths = Array.isArray(ar.paths) ? ar.paths.join(', ') : ''
    const out = await agent(
      `영역 "${ar.name}"(${paths})의 구조를 읽어 요약하라: 책임(responsibilities)·핵심 파일(keyFiles)·` +
        '진입점(entryPoints)·의존(dependencies). codebase-onboarding 스킬 지침이 있으면 적용하라.',
      { agentType: 'dev-toolkit:architect', schema: AREA_SCHEMA, phase: '분석', label: `분석:${ar.name}` },
    )
    return out || { name: ar.name, responsibilities: '(읽기 실패)' }
  }),
)).filter(Boolean)
log(`영역 요약 ${summaries.length}건`)

// 3) 통합 -----------------------------------------------------------------
phase('통합')
const map = await agent(
  '다음은 영역별 구조 요약(JSON)이다. 이를 하나의 한국어 마크다운 "아키텍처 맵"으로 통합하라. ' +
    '구성: ① 전체 개요(계층·데이터 흐름), ② 영역별 책임·진입점·의존, ③ 교차 관심사(인증·로깅·트랜잭션 등), ④ 주목할 결합/위험. ' +
    'architect 관점으로 작성.\n\n' +
    JSON.stringify(summaries),
  { agentType: 'dev-toolkit:architect', label: '아키텍처 맵' },
)
// 리포트 에이전트가 드물게 도구 호출을 본문으로 흘린다(`SubagentHandback({message: `…`})` + 꼬리말 — 실제 실행에서 관측). 본문만 남긴다.
function cleanReport(s) {
  if (typeof s !== 'string') return s
  const m = s.match(/^\s*SubagentHandback\(\{\s*message:\s*`([\s\S]*)`\s*\}\)/)
  return m ? m[1].replace(/\\`/g, '`').trim() : s
}
return cleanReport(map)
