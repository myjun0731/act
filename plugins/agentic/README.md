# agentic

에이전트 엔지니어링 스킬: 보안 하드닝·아키텍처 감사·벤치마크 최적화 + 멀티에이전트/병렬 오케스트레이션·자율 루프(parallel-execution-optimizer, agentic-os, loop-design-check 등). ECC(MIT) 선별 내재화.

```
claude plugin install agentic@act
```

- allinone에 포함된다(allinone 설치 시 함께 설치).
- 출처와 변경 내용은 [ATTRIBUTION.md](ATTRIBUTION.md).

## 구성

<!-- inventory:begin -->
### 스킬 (41)

| 스킬 | 설명 |
|---|---|
| `agent-architecture-audit` | Full-stack diagnostic for agent and LLM applications. |
| `agent-eval` | Head-to-head comparison of coding agents (Claude Code, Aider, Codex, etc.) on custom tasks with pass rate, cost, time, and consistency metrics. |
| `agent-harness-construction` | Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates. |
| `agent-introspection-debugging` | Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection reports. |
| `agent-payment-x402` | Add x402 payment execution to AI agents with per-task budgets, spending controls, and non-custodial wallets. |
| `agent-runtime-gateway-smoke-test` | Verify a local agent API, temporary gateway tunnel, and remote sandbox callback with a tool-free task, then restore the original app connection. |
| `agent-security-hardening` | Security hardening guidance for AI agent frameworks that process untrusted content, invoke tools, write workspace files, manage runtime identifiers, … |
| `agent-self-evaluation` | Use after completing any non-trivial task. |
| `agentic-engineering` | Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing. |
| `agentic-os` | Build persistent multi-agent operating systems on Claude Code. |
| `ai-first-engineering` | Engineering operating model for teams where AI agents generate a large share of implementation output. |
| `autonomous-loops` | Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems. |
| `benchmark-optimization-loop` | Turn a user's improvement goal into a bounded benchmark-guided loop: define success and hard constraints, establish a baseline, test one-hypothesis v… |
| `blueprint` | Turn a one-line objective into a step-by-step construction plan for multi-session, multi-agent engineering projects: one-PR-sized steps with self-con… |
| `context-budget` | Routes live context checks to the native Codex or Claude Code meter without scanning files, and performs a bounded static component audit only when e… |
| `continuous-agent-loop` | Patterns for continuous autonomous agent loops with quality gates, evals, and recovery controls. |
| `cost-aware-llm-pipeline` | Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching. |
| `council` | Convene a four-voice council for ambiguous decisions, tradeoffs, and go/no-go calls. |
| `council-multi-model` | Add one optional external Codex critique after the existing council has produced a decision draft. |
| `data-scraper-agent` | Build a fully automated AI-powered data collection agent for any public source — job boards, prices, news, GitHub, sports, anything. |
| `dev-team` | Simulate a collaborative dev team session where multiple role-based personas (PM, Architect, Developer, QA) respond to the same problem together in o… |
| `dmux-workflows` | Multi-agent orchestration using dmux (tmux pane manager for AI agents). |
| `dynamic-workflow-mode` | Design task-local harnesses, eval gates, and reusable skill extraction for Claude dynamic workflow mode and other adaptive agent harnesses. |
| `enterprise-agent-ops` | Operational controls for long-lived or cloud-hosted agent systems — runtime lifecycle (start, pause, stop, restart), observability (logs, metrics, tr… |
| `eval-harness` | Eval-driven development (EDD) framework for AI coding sessions — define capability and regression evals before coding, grade with code-based, model-b… |
| `gan-style-harness` | GAN-inspired Generator-Evaluator agent harness for building high-quality applications autonomously. |
| `hookify-rules` | Create and configure hookify rules — markdown files with YAML frontmatter that match bash, file, prompt, or stop events by regex or conditions and sh… |
| `iterative-retrieval` | Pattern for progressively refining context retrieval to solve the subagent context problem. |
| `loop-design-check` | Design a goal-oriented agent loop or review one for failure modes: spinning, Goodhart-gaming the verifier, or running a wrong answer to completion. |
| `parallel-execution-optimizer` | Speed up a task by turning it into a dependency graph of parallel lanes with a lane matrix, batched reads and checks, write surfaces isolated by file… |
| `prompt-caching-strategy` | Optimize LLM prompt caching hit rate to reduce API costs and improve latency. |
| `ralphinho-rfc-pipeline` | Split an RFC into a multi-agent execution DAG — decompose into work units with dependencies and acceptance tests, run research, plan, implement, test… |
| `recursive-decision-ledger` | Run repeated rollouts ("Prime Gauss" style recursive prompting) while keeping an append-only decision ledger of trials, marks, coherence checks, and … |
| `regex-vs-llm-structured-text` | Decision framework for parsing structured text (quizzes, forms, invoices, receipts, tables) with a hybrid regex-first pipeline — regex extraction han… |
| `rules-distill` | Scan skills to extract cross-cutting principles and distill them into rules — append, revise, or create new rule files. |
| `santa-method` | Multi-agent adversarial verification: two independent reviewers with the same rubric must both pass before output ships, with a fix-and-re-review con… |
| `skill-comply` | Visualize whether skills, rules, and agent definitions are actually followed — auto-generates scenarios at 3 prompt strictness levels, runs agents, c… |
| `skill-host-compat` | Lint skills for Codex/Cursor-safe frontmatter and Claude-only substitutions before a skill PR. |
| `team-agent-orchestration` | Run team-based orchestration for agent squads: work items with owners and scope, agent Kanban state, branch isolation, control pane visibility, and m… |
| `team-builder` | Interactive picker that discovers available agent personas via the claude agents command and agents/ markdown globs, groups them into domains, has th… |
| `token-budget-advisor` | Offer a choice of response depth (25%/50%/75%/100%) with token estimates before answering, then answer at that level. |
<!-- inventory:end -->
