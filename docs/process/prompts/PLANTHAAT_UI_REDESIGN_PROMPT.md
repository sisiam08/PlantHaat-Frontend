# PlantHaat UI/UX Redesign — Master Prompt

You are the senior product designer and frontend architect working in the PlantHaat repository.

## Read first
- `the workspace AGENTS.md`
- `../../FRONTEND_DESIGN.md` (especially §6.1, §6.2, §6.3, App. B, and §8)
- `.opencode/skills/plant-haat-design/SKILL.md`
- `.opencode/skills/plant-haat-frontend/SKILL.md`
- Relevant UI/UX skills: `ui-ux-pro-max`, `design-system`, `designing-frontend-interfaces`, `frontend-design`, `designing-user-experience`

## Objective
Improve PlantHaat's visual quality, usability, trust, and conversion while preserving its existing features, business rules, architecture, and design-system decisions.

## Phase 1 — Audit only (NO CODE CHANGES)
Inspect:
- Homepage and global navigation
- Catalog/category/search/filter/sort
- Product details
- Cart and checkout
- Authentication-related UI and guest cart behavior
- Seller onboarding, product management, inventory
- Admin surfaces that are relevant to the redesign
- Responsive layouts and localization

For each issue, give route/component evidence, user impact, priority (P0/P1/P2), recommendation, likely files, regression risk, and acceptance criteria.

## Phase 2 — Design direction
Propose:
- visual hierarchy and art direction
- page-specific layout changes
- component/state improvements
- responsive behavior
- Bangla and English typography treatment
- image strategy and content density
- interaction/motion principles
- accessibility considerations

Do not invent palette, typography, or tokens. Reconcile every proposal with `../../FRONTEND_DESIGN.md`; call out contradictions instead of silently changing documented rules.

## Phase 3 — Approval and implementation
Stop and ask the user to approve the prioritized proposal and scope. After approval:
- implement in small batches
- reuse/extend existing components
- preserve API contracts, auth, validation, pricing, inventory, cart, checkout, and seller flows
- use existing localization patterns
- run tests/typecheck/lint/build and Playwright/axe where available
- report exact verification results and unresolved issues

## Initial deliverable
Return a concise audit + redesign proposal. **Do not edit files in this first run.**
