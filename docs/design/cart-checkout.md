# Cart and checkout findings

Last verified: 2026-11-17 · Branch `redesign/phase2`. Consolidated from the former cart/checkout QA README; screenshots were temporary evidence and are no longer committed.

## Defects fixed

| Area | Defect | Fix |
|---|---|---|
| Cart quantity | PUT response (no district) replaced the district cart cache; totals blanked and "does not deliver" appeared | Never write mutation response to cache; reconcile with district-scoped GET |
| Cart quantity | 10 rapid clicks sent overlapping requests and stale responses won | 350 ms per-line debounce + latest-wins sequence; stale responses ignored |
| Cart totals | Money disappeared while requests were in flight | Recompute line totals, per-shop subtotals, delivery (free-threshold aware) and grand total from items immediately |
| Delivery state | Missing quote was rendered as "not available" | Unavailable only when `deliverable === false`; loading shows "Updating delivery."; query errors show their own banner |
| Cart errors | Any query error replaced the whole cart even when data existed | Full error only when there is no data; stale data stays with a retry banner |
| Quantity errors | Rejected limits blanked the line | Inline per-line error + toast, optimistic rollback |
| Summary card | Double card padding and 320 px width squeezed values | `py-0` card, `p-4 sm:p-5` content, 360 px column |
| Summary rows | Values could shrink/wrap; long names overflowed | `shrink-0` values, truncation + `title` tooltips |
| Totals hierarchy | Grand total not distinct | Separator + `text-base font-bold`; delivery total muted |
| Checkout rhythm | `gap-3` sections, `gap-5` page grid, cramped address cards | `gap-4` sections, `gap-6` page grid, `p-4` address cards |
| Checkout long content | Address could overflow | Two-line clamp + title tooltip |
| Checkout line items | Quantity separator was mojibake | Explicit `x` with screen-reader quantity label |

## Cart round 2 — duplicate summary and line layout

- Root cause: two `CartSummaryBox` instances existed; the second card was `hidden ... lg:grid`, so at ≥lg both were visible. The sidebar card also inherited `align-items: stretch`, making it as tall as the left shop column.
- Fix: one summary instance; mobile bar separate and observer-hidden when the card is visible; `self-start h-fit`; no `h-full`/`justify-between`; sticky only at lg; internal scroll for many shops.
- Desktop line grid: `72px minmax(0,1fr) auto 112px 44px`, 16 px gaps; unit price inside the info column; two-row grid at <md; no absolute positioning.
- Verified: one summary/one Checkout, card height ≤ content + 8 px, gaps ≤ 28 px, no stepper/unit overlap, no clipped unit text. e2e passed across en/bn and 1024/1280/1440 + mobile 360/390.

## Checkout round 3 — spacing, quantity wording, sticky actions

- Root cause of huge gaps: the checkout grid and the left column used default `align-items/align-content: stretch`, so the shorter form column was stretched to the summary height; section rows stretched too (the payment `<h2>` box grew to 197 px).
- Fix: `lg:items-start` on the outer grid, `self-start` + `content-start` on the left column, `content-start` on each section, 24 px between sections, 12–16 px heading-to-card, content-height cards with `p-4`.
- Measured after at 1280×800: title→first section 24 px; section gap 24 px; heading→card 16 px (address) and 12 px (payment); address card 94 px; payment option card 79 px. Summary is one card with a scrollable breakdown and a fixed footer; Place order and Back to cart stay inside the 800 px viewport at top/middle/bottom for 1, 3 and 6 shops.
- Mobile: summary follows the form; the fixed bottom bar appears only while the in-flow Place order button is offscreen, and exactly one Place order is visible.
- Quantity wording: one shared `QuantityLine`/`ProductLine` renders `Qty 7 × ৳190 each` (and the Bangla equivalent) on checkout, cart secondary lines, order summary and customer/seller/admin order detail.
- Regression test: `frontend/e2e/checkout-layout.spec.ts`, 30/30 (en/bn; 1024/1280/1440 + 360/390; 1/3/6 shops).
