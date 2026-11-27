---
name: skill-host-compat
description: Lint skills for Codex/Cursor-safe frontmatter and Claude-only substitutions before a skill PR.
metadata:
  origin: ECC
---

# Skill Host Compatibility

Check the skill directory you are checking for host compatibility before opening a
skill PR. The check is for Codex and Cursor copies, not Claude-only runtime quality.
Nothing is bundled to run it: perform the checks below by reading the files (for
example with `grep`), or run your repository's own host-compat validator if it has one.

## When to Activate

- Adding or editing a skill that will also ship to Codex or Cursor
- Copying a skill into `.agents/skills/` or `.cursor/skills/`
- A review asks whether a skill is safe to install into Codex or Cursor
- CI reports host-compatibility findings

## Core Concepts

The canonical copy is the skill directory you are checking. Codex loads
`.agents/skills/`. Cursor loads `.cursor/skills/`. Syncing those copies is
usually manual.

A plain `SKILL.md` validator usually only checks that `name` / `description`
are usable YAML. These checks are the cross-tree gate:

1. Claude-only substitutions in executable `bash` / `sh` / `zsh` fences
   in Codex/Cursor projections (`${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`,
   `${CLAUDE_PROJECT_DIR}`, `$ARGUMENTS`) fail. Codex leaves those tokens
   as literal text. In a Codex copy, rewrite `${CLAUDE_PROJECT_DIR}` to
   `$(pwd)` or an explicit path.
2. A Codex copy may only use `name`, `description`, `metadata`, `license`,
   and `allowed-tools`. A top-level `origin:` key may stay on the canonical
   copy and must be stripped on the Codex copy.
3. A skill that is meant to ship to Codex must have `.agents/skills/<name>/`.
   Cursor copies are optional; when present, `name:` must match the directory.
4. Checklist items (When to Activate, Anti-Patterns, name matches directory,
   500/800 line caps) are warnings, not failures, unless the user asks for a
   strict check.

## Code Examples

Point the checks at the skill directory you are checking (`SKILL_PATH` below):

```bash
SKILL_PATH=path/to/skill-dir
# 1. Claude-only substitutions (inspect hits inside bash/sh/zsh fences)
grep -nE '\$\{CLAUDE_(SESSION_ID|SKILL_DIR|PLUGIN_ROOT|PROJECT_DIR)\}|\$ARGUMENTS' "$SKILL_PATH"/SKILL.md
# 2. Frontmatter keys of a Codex copy
sed -n '1,/^---$/{p}' .agents/skills/"$(basename "$SKILL_PATH")"/SKILL.md
```

Report failures (rules 1–3) separately from checklist warnings (rule 4).

Slash command:

```
/agentic:skill-host-compat path/to/skill-dir
```

## Anti-Patterns

Codex and Cursor projections must resolve Claude-only substitutions in executable blocks. Canonical Claude-scoped examples remain valid. POSIX `$1` and `${1}` parameters are ambiguous and require review rather than failing this gate. This fence is the
forbidden pattern:

```bash
echo "${CLAUDE_SESSION_ID}"
ls "${CLAUDE_SKILL_DIR}"
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.js" $ARGUMENTS
cd "${CLAUDE_PROJECT_DIR}"
```

Do not add `version:` or `origin:` to a Codex copy under `.agents/skills/`.
Do not treat a passing plain `SKILL.md` validator run as Codex-safe. Do not require
every `skills/` entry to have a Cursor copy.

## Best Practices

- Keep a canonical `origin:` key if your contribution template calls for it.
- Drop `origin`, `version`, and `argument-hint` on the Codex copy.
- Show host-portable commands in bash fences (`npx` or a resolved root). Rewrite `${CLAUDE_PROJECT_DIR}` in Codex copies to `$(pwd)` or an
  explicit path. Keep valid Claude-scoped forms in canonical instructions; resolve host variables in the target projection.
- Run these checks before the repository's test suite when the change is a new skill.

## Related Skills

- `skill-comply` — runtime behavioral traces, not host-portability
- `skill-stocktake` (core) — holistic audit of installed skills
- `skill-scout` (core) — search existing skills before creating a new one
