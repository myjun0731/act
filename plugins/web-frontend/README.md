# web-frontend

웹 프론트엔드 스킬: React·Vue·Angular·Nuxt·Next.js·Vite 패턴, 접근성(WCAG)·i18n·모션·디자인 시스템·SEO. ECC(MIT) 내재화.


```
claude plugin install web-frontend@act
```

- **opt-in**: allinone에 포함되지 않는다. 필요할 때만 `claude plugin install web-frontend@act`로 설치한다.
- **독립 동작**: ECC 하네스(커맨드·에이전트·훅·메모리) 없이 동작하도록 고쳐서 넣는다. `python scripts/check_skills.py --plugin web-frontend`이 ERROR 0이어야 한다.
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md), 원본 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있다.

## 구성

<!-- inventory:begin -->
### 스킬 (22)

| 스킬 | 설명 |
|---|---|
| `accessibility` | Design, implement, and audit accessible UI to WCAG 2.2 Level AA across Web, iOS, and Android — semantic ARIA roles and labels, accessibility traits a… |
| `angular-developer` | Generates Angular code and provides architectural guidance. |
| `design-system` | Generate a design system from an existing codebase or audit one for visual consistency: extract tokens (colors, typography, spacing, shadows) into de… |
| `frontend-a11y` | Accessibility patterns for React and Next.js — semantic HTML, ARIA attributes, form labeling, keyboard navigation, focus management, and screen reade… |
| `frontend-design-direction` | Set a product-specific frontend design direction for production UI work. |
| `frontend-patterns` | Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices. |
| `i18n-sync` | Translate and synchronize application JSON locale files using source-key usage, project terminology, and focused validation. |
| `make-interfaces-feel-better` | Apply concrete design-engineering details that make interfaces feel polished. |
| `motion-advanced` | Advanced motion patterns for React / Next.js — drag & drop, gestures, text animations, SVG path drawing, custom hooks, imperative sequences (useAnima… |
| `motion-foundations` | Motion tokens, spring presets, performance rules, device adaptation, accessibility enforcement, and SSR safety for React / Next.js using motion/react. |
| `motion-patterns` | Production-ready animation patterns for React / Next.js — button, modal, toast, stagger, page transitions, exit animations, scroll, and layout — buil… |
| `nextjs-turbopack` | Next.js 16+ and Turbopack guidance — incremental Rust bundling, file-system caching, faster dev startup and HMR, Turbopack vs webpack tradeoffs, and … |
| `nuxt4-patterns` | Nuxt 4 app patterns for hydration safety, performance, route rules, lazy loading, and SSR-safe data fetching with useFetch and useAsyncData. |
| `react-native-patterns` | React Native and Expo app patterns — Expo Router navigation, state separation (server/client/route/form), TanStack Query data fetching with Zod, perf… |
| `react-patterns` | React 18/19 patterns including hooks discipline, server/client component boundaries, Suspense + error boundaries, form actions, data fetching, state … |
| `react-performance` | React and Next.js performance optimization patterns adapted from Vercel Engineering's React Best Practices (https://github.com/vercel-labs/agent-skil… |
| `react-testing` | React component testing with React Testing Library, Vitest/Jest, MSW for network mocking, accessibility assertions with axe, and the decision boundar… |
| `seo` | Audit, plan, and implement SEO improvements across technical SEO, on-page optimization, structured data, Core Web Vitals, and content strategy. |
| `ui-to-vue` | Use when the user has UI screenshots or design exports that need batch conversion into Vue 3 components, especially with Vant, Element Plus, or Ant D… |
| `vite-patterns` | Vite build tool patterns including config, plugins, HMR, env variables, proxy setup, SSR, library mode, dependency pre-bundling, and build optimizati… |
| `vue-patterns` | Vue.js 3 Composition API patterns, component architecture, reactivity best practices, Pinia state management, Vue Router navigation, and Nuxt SSR pat… |
| `yoruba-localization-testing` | Test Yoruba (yo) and English bilingual interfaces for tone marks, underdots, Unicode normalization, translation fallback, and accessibility. |

### 에이전트 (1)

| 에이전트 | 설명 |
|---|---|
| `web-frontend:react-build-resolver` | Diagnose and fix React build failures across Vite, webpack, Next.js, CRA, Parcel, esbuild, and Bun. |
<!-- inventory:end -->
