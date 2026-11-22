# Frontend documentation index

Canonical docs for the frontend repo (`redesign/phase2`). Documentation lives only in `<repo>/docs`; one file per topic. UI-owned docs live here; backend/payments/process docs live in `backend/docs`.

| File | Purpose | Owner | Last verified |
|---|---|---|---|
| `FRONTEND_DESIGN.md` | Frontend final-state design: stack, BFF, auth, i18n, tokens, routes, flows, accessibility | frontend | 2026-11-18 |
| `FRONTEND_CONTEXT.md` | Working rules, progress log, decisions/deviations, known issues | frontend | 2026-11-18 |
| `design/DIRECTION.md` | Approved "Living Herbarium" redesign direction and batch plan | frontend | 2026-11-18 (status corrected: implemented) |
| `design/MASTER.md` | Reconciled design-system master (tokens, type, components) | frontend | 2026-11-18 |
| `design/audit.md` | Consolidated customer-facing design audit (home + consistency) | frontend | 2026-11-18 |
| `design/performance.md` | Consolidated performance baseline, method, causes and remaining work | frontend | 2026-11-18 |
| `design/typography.md` | Type system, copy changes, overflow findings | frontend | 2026-11-18 |
| `design/cart-checkout.md` | Cart/checkout defect/fix record and measured layout rules | frontend | 2026-11-18 |
| `design/dashboard-guide.md` | Admin/seller dashboard guidelines, shared kit, analytics API and page-by-page retention checklist | frontend | 2026-11-22 |
| `testing/live-log.md` | Chronological live browser verification log | frontend | 2026-11-18 |
| `process/prompts/*.md` | Generic agent process prompts (redesign, feature, production audit) | frontend | 2026-11-18 |
| `reference/README.md` | Policy for owner-provided reference images (none committed at cleanup) | frontend | 2026-11-18 |

## Hero plant assets (how to replace a photo)

The hero scene uses four transparent AVIF/WebP cutouts built from owner-provided source photos.
Sources live in the workspace root `hero-source/` and are **not committed**:

```
hero-source/
  monstera.webp
  areca palm.webp
  snake plant.webp
  calathea.webp
  ficus elastica plant.webp   # spare, not used
  anthurium.webp              # not used (red flower competes with the CTA)
```

To replace one, drop the same filename in `hero-source/` (transparent WebP/PNG with alpha) and run,
from `frontend/`:

```bash
node scripts/build-hero-assets.mjs
```

It crops to the alpha bbox, mirrors calathea, equalizes brightness, pads 6%, checks the outer 1%
alpha bands and feathers clipped left/right/top edges (the bottom pot base is not feathered), then
writes AVIF + WebP (`large`, 60% and palm 45%/75% variants), `public/hero/scene.json` and the typed
`src/features/catalog/hero-scene.generated.ts`. Commit the generated AVIF/WebP/JSON/TS, never the
source photos. The script uses the native sharp already installed in `backend/node_modules` when the
frontend copy is the incomplete WASM fallback; no package is added.

If a source photo has frond tips cut off at the original canvas edge (the current palm has opaque
pixels within the right 1% band), the script feathers them. For the full tips, replace the file with
an uncropped cutout that has at least 3% transparent margin on **every** side, rerun the script, and
re-check the 2x crops/renders. Adjust the `PLANTS` table only if the composition itself changes, then
re-check 1440/1280/768/899/412/390/360 visually.

## Backend canonical docs

- `backend/docs/PAYMENTS_MASTER_PROMPT.md`, `progress.md`, `decisions-log.md`
- `backend/docs/payments/design.md`, `payments/api.md`, `payments/manual-test.md`, `payments/live-report.md`
- `backend/docs/settings/reference.md`, `settings/manual-test.md`, `auth/sessions.md`, `testing/baseline.md`
- `backend/docs/BACKEND_DESIGN.md`, `BACKEND_CONTEXT.md`, `BACKEND_CHANGE_REQUESTS.md`, `UPLOAD_SYSTEM.md`, `api/conventions.md`, `api/realtime.md`

## Conventions

- Docs live only in `<repo>/docs`; do not create a separate docs repo or root-level docs.
- One canonical file per topic. Cross-reference the other repo instead of duplicating content.
- No screenshots or raw measurement dumps are committed. Agent screenshots go to a gitignored folder such as `frontend/.artifacts/` (or the OS temp dir) and are deleted after the report text is written. Only owner-provided reference images may live in `docs/reference/`.
- Temporary scripts and diagnostic specs are deleted at the end of the task that created them.
- Progress and decision logs are single files, appended chronologically (`backend/docs/progress.md`, `backend/docs/decisions-log.md`).
- Every task updates the canonical docs instead of creating new files.
- File names are kebab-case, except established spec names (`FRONTEND_DESIGN.md`, `FRONTEND_CONTEXT.md`, `DIRECTION.md`, `MASTER.md`).
