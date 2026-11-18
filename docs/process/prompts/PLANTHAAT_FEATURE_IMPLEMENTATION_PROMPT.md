# PlantHaat Feature Implementation Prompt

Implement the requested PlantHaat feature safely and consistently.

## Before coding
1. Read `the workspace AGENTS.md` and `../../FRONTEND_DESIGN.md`.
2. Read `.opencode/skills/plant-haat-frontend/SKILL.md` and relevant feature-specific skills.
3. Inspect the current code, architecture, API contracts, database models, authorization, validation, and tests.
4. Clarify ambiguous requirements; do not guess important business rules.
5. State a concise plan, affected files, edge cases, and risks.

## Requirements
- Implement the requested behavior end-to-end, not just a visual mock.
- Preserve existing behavior and contracts outside the requested scope.
- Respect existing design tokens, shadcn patterns, light-only theme, Kalpurush + Inter, and next-intl localization.
- Include loading, empty, error, success, disabled, validation, and permission states where relevant.
- Handle responsive layouts and accessibility.
- Do not hard-code fake data or bypass server-side validation/authorization.
- Avoid unrelated refactors and new dependencies unless justified.

## Verification
- Run the relevant repository scripts (lint, typecheck, tests, build).
- Use Playwright and axe-core if available.
- State which commands ran and their actual outcomes; clearly list checks not run.

## Final report
- Summary of behavior delivered
- Files changed
- Tests/checks and results
- Risks, limitations, and follow-up work
