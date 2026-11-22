# Admin and seller dashboards — guidelines and information-retention checklist

Canonical dashboard spec for the admin and seller panels. `FRONTEND_DESIGN.md` §6.8 points here.
Page ownership and duplicate decisions stay in `backend/docs/admin-audit.md` and
`backend/docs/seller-audit.md`.

## 1. Research decisions (one-line rationale)

| # | Decision | Rationale |
|---|---|---|
| 1 | Overview first, details on demand: the panel home is a scan layer (KPIs → trend → queues → top lists); every widget links to its list/detail. | The 5-second scan answers "how is the business doing / what needs me" before navigation. |
| 2 | One primary question per chart: trend = line/area, comparison = grouped bar, composition = donut (≤ 5 named slices + Other), pipeline = stage/status bars, progress = bullet/meter, distribution = histogram/bar. | Chart choice follows the question; no pie with many slices and no dual axes. |
| 3 | KPI cards always show value + delta vs the previous equal-length period + sparkline; the delta has an arrow, a sign and a word, not only colour. | Established dashboard practice and accessible without colour vision. |
| 4 | Period selector: Today / 7d / 30d / 90d / custom plus compare-to-previous; Asia/Dhaka calendar days; series capped at ≤ 90 points (weekly beyond 90 days). | One predictable time model; caps keep payload and rendering fast. |
| 5 | Every chart has a one-sentence text summary and a "View data" table toggle (CSV where rows are already in memory). | WCAG text-alternative guidance and auditable numbers. |
| 6 | Chart interaction: the plot is one focus stop; arrows/Home/End move the active point; a live region announces the exact value. | Avoids 60+ tab stops while keeping every point keyboard-reachable. |
| 7 | Palette = existing chart tokens in a colour-blind-safe order (forest, info blue, terracotta, sage, marigold) plus shape markers and textures; gridlines use `--border`. | Reuses tokens, keeps ≥ 3:1 element contrast, never encodes by colour alone. |
| 8 | Tables keep sticky headers, sortable headers, a density toggle and become labelled cards below `md`. | Long admin lists stay scannable and usable at 360 px. |
| 9 | Animated tabs use the ARIA tabs pattern with one sliding indicator, 150–250 ms transform/opacity only, lazy panels kept after first visit, URL-synced state, instant under reduced motion. | Smooth without layout thrash or motion-sensitivity issues. |
| 10 | Loading is skeleton-first with the final box size; charts animate only on first visible render (≤ 400 ms); no looping animation; tables never animate. | Preserves CLS and perceived speed on low-end phones. |
| 11 | Mobile: KPI strip is a horizontal snap rail, tab strips scroll with edge fade and auto-scroll the active tab, page actions stay reachable, targets ≥ 44 px. | Sellers mostly use phones; 360 px is the primary breakpoint. |
| 12 | Empty/zero states say what happened and what to do next; charts show the empty state instead of a flat zero line. | Visibility of system status + a way forward; avoids fake-looking data. |
| 13 | Never invent data: every added series (aging, conversion, top lists, wallet buckets, release timeline) is computed from real tables; a missing model means the widget is omitted. | Dashboards must equal the underlying money/order tables. |
| 14 | Charts are hand-built SVG primitives; `recharts` stays installed but unimported. | Smaller route bundles, full keyboard/a11y control, no new dependency. |
| 15 | Dashboard primitives live in `src/components/dashboard/`, are client-only where interactive, and are never imported by public/customer routes (guard test + bundle check). | Public performance is unchanged and private-only code stays out of the storefront. |
| 16 | Money always uses `<Price>`; compact axis numbers are Latin digits (`1.2k`, `3.4M`) with exact values in tooltips/tables; dates use `formatLatinDateTime`/Asia-Dhaka. | One money/date convention across the app. |
| 17 | Route state is URL-driven where it matters (tab param, order filters/pagination). | Shareable/reload-safe screens. |
| 18 | Analytics responses are read-only, role-scoped SQL aggregates with a 30 s in-process cache outside tests. | Charts refresh freely without hammering the DB; writes stay in existing services. |
| 19 | No speculative indexes: an index is added only after `EXPLAIN ANALYZE` on `planthaat_test` proves a need. | Avoid migrations on a small dataset. |
| 20 | Synthetic demo data is seeded only into `planthaat_test` by a marker-tagged, idempotent script with a cleanup counterpart. | Judge dashboards with realistic volume without touching dev/production. |

## 2. Shared dashboard kit

Location `frontend/src/components/dashboard/`; tokens only; no global CSS additions.

| Primitive | Contract |
|---|---|
| `KpiCard` | label, value slot, delta (value/direction/meaning/label), sparkline, optional target progress, detail link. |
| `ChartCard` | title/subtitle/actions, one-sentence summary, loading/empty/error+retry, "View data" table toggle, CSV export, exact-size skeleton. |
| `LineAreaChart` | one or more series (area/line/dashed), Dhaka-day labels, y ticks, direct last-point marker, keyboard point navigation, live announcement. |
| `BarChart` | vertical grouped/stacked and horizontal ranking bars, texture overlay per series, pointer + keyboard values. |
| `DonutChart` | composition with ≤ 5 named slices + "Other", centre total, legend with exact value and share. |
| `FunnelChart` | stage bars with counts and step conversion, not a misleading polygon. |
| `ProgressBar` / `Gauge` | `role="meter"` with label, min/max, exact value text and optional target marker. |
| `Sparkline` | decorative inline trend; exact value lives in the KPI text. |
| `Legend` | colour swatch + shape marker + optional value; can toggle series. |
| `ChartSummary` | the text alternative also used as the chart's accessible description. |
| `DataTable` | sticky header, sortable columns, density toggle, mobile card layout, empty text. |
| `AnimatedTabs` | ARIA tabs, sliding indicator, lazy panels kept after first visit, URL param sync, reduced-motion aware. |
| `DateRangePicker` | Today/7d/30d/90d/custom + compare toggle; Asia/Dhaka bounds. |
| `StatusTimeline` | compact done/current/pending/failed timeline for detail screens. |
| `Skeletons` | KPI/chart/table placeholders with the exact final dimensions. |

Preview: `/dev/dashboard-kit` (dev/test only; 404 in production, disallowed in `robots.ts`). Unit tests
cover chart math, Dhaka ranges, KPI deltas, ChartCard states/toggle, donut grouping, funnel conversions,
meter semantics, tab keyboard/URL/lazy behaviour and table sorting/density.

## 3. Analytics API (read-only)

`GET /api/v1/admin/analytics/panels` and `GET /api/v1/seller/analytics/panels`, both `from`/`to` ISO
query params. Seller scope is enforced by `requireShop`; admin requires `Role.ADMIN`. All money is a
decimal string, buckets are Asia/Dhaka (`YYYY-MM-DD`, or week/month start), series are capped ≤ 90
points. Responses add, without changing existing endpoints:

- KPIs with current/previous/delta: GMV, orders, AOV, delivered orders, commission, new customers/sellers, refunds (admin); revenue, orders, AOV, delivered, commission, cancellations (seller).
- `series`: orders/GMV/delivered revenue/commission/delivered/cancelled (admin); orders/revenue/delivered revenue/delivered/cancelled (seller).
- `ordersByStatus`, `paymentMix`, verification aging + pending amount, dispute status/type/aging/resolution, refunds queue + advance refund obligations, withdrawals pending/paid/turnaround/aging, reconciliation buckets + A4/A5 conservation, inventory low/out-of-stock, rating distribution, delivery-performance buckets, top shops/products/categories/districts.
- Seller: wallet buckets from `LedgerService.balances`, release timeline from `SELLER_PENDING.releaseAt`, top products, inventory, ratings, disputes, withdrawals, delivery performance.
- Consistency tests assert chart totals equal the existing overview/table totals; scope tests assert a seller never sees another shop; a PII test asserts no phone/email/TrxID/sender number appears.

## 4. Page inventory and retention checklist

Retention rule: each row's content must map to at least one of KPI tooltip, chart summary/data table,
list filter, detail page or action. Tick a row only after verifying the item at 1280 and 360.

**Admin**

| Page | What must remain | Phase 2 status / where it lives |
|---|---|---|
| `/admin` | 7/30/90 range; queue counters (open disputes, pending withdrawals, advance refunds, payments to verify, reconciliation); GMV, orders, commission, pending approvals, new customers/sellers, cancellation/complaint rates, stuck orders, suspended-seller open orders, false-delivery flags; daily GMV bars; top shops/products/districts. | ✅ Period selector (Today/7d/30d/90d/custom); queue tiles; KPI strip with sparklines/deltas; GMV/orders/delivered/commission trend tabs; operations snapshot; orders-by-status; payment mix; verification aging; disputes status/type/aging; refunds/withdrawals queues; settlement donut + breach; inventory/ratings/delivery; top shops/products/categories/districts (data tables + CSV). |
| `/admin/orders`, `/admin/orders/[id]` | Status filter; rows with order/shop/total/status/payment; detail items, totals, customer/address, payment, history, transitions, cancellation response. | ✅ Status filter + date range + KPI strip; status distribution chart/table; sortable/density DataTable (summary projection); pager. Detail unchanged (all fields). |
| `/admin/refunds` | Status filter; payment refunds with approve/reject/process. | ✅ PageHeader + refunds health strip (pending/processed/advance required); list/actions unchanged. |
| `/admin/withdrawals` | Seller requests, status filter, masked destination reveal (re-auth), pay/reject. | ✅ PageHeader + withdrawals health strip (pending/paid/turnaround/aging); list/actions unchanged. |
| `/admin/advance-payments` | Pending verification queue: order, amount, provider, TrxID, sender number, time, proof; verify/reject. | ✅ Dashboard/period widgets cover the queue health; queue itself unchanged (tabs pending/SLA/all). |
| `/admin/advance-refunds` | REFUND_REQUIRED obligations, record refund TrxID. | ✅ Dashboard/refunds widgets cover obligations; queue unchanged. |
| `/admin/reconciliation` | Period, totals, violations/breach banner, settlement buckets, ledger, help text. | ✅ Period, checked count, balanced/breach banner, settlement totals, bucket composition donut + ranking + data table/CSV, sortable violations table (mobile cards). |
| `/admin/commission-rules` | Rules/scopes, effective default, create/update/delete. | ✅ PageHeader + commission/GMV/AOV strip + commission trend; rules/actions unchanged. |
| `/admin/complaints`, `/admin/complaints/[id]` | Status/seller/age/amount filters; ticket/customer/shop/type/status/amount rows; thread, attachments/evidence, internal notes, refund/hold decision. | ✅ PageHeader + disputes health strip (open/created/avg resolution/status donut); filters/list/decision unchanged. |
| `/admin/sellers`, `/admin/sellers/[id]` | Status filter, rows; detail profile, contacts, shop links, documents viewer, ledger, dues/adjustment, bulk cancel, approve/reject/suspend/reactivate, audit trail. | ◐ PageHeader applied; rows/detail/actions unchanged (no seller-status series exists; no fake chart added). |
| `/admin/suspended-sellers` | Suspended queue and open orders with bulk-cancel links. | ◐ PageHeader applied; queue unchanged. |
| `/admin/users`, `/admin/users/[id]` | Role/status filters, rows, create admin, suspend/reactivate; detail profile/actions. | ◐ PageHeader applied; rows/detail/actions unchanged. |
| `/admin/shops` | Name/slug/status/seller rows, suspend/reactivate. | ◐ PageHeader applied; rows/actions unchanged. |
| `/admin/products` | Status filter, moderation rows (name/shop/status/price), approve/reject/remove. | ◐ PageHeader applied; list/actions unchanged. |
| `/admin/categories` | Category list/CRUD, active/sort/image. | ◐ PageHeader applied; CRUD unchanged. |
| `/admin/payments`, `/admin/payments/[id]` | Legacy payment filters (status/method/order/date), rows and detail. | ◐ PageHeader applied; list/detail unchanged. |
| `/admin/payouts` | Manual payout history, create/update status. | ◐ PageHeader applied; list/actions unchanged. |
| `/admin/stuck-orders` | Flagged queue, reminder count, overdue filter, age. | ◐ PageHeader applied; queue unchanged. |
| `/admin/cod-risk` | Risk profiles, status/whitelist actions, search. | ◐ PageHeader applied; list/actions unchanged. |
| `/admin/content-reports` | Report list and hide/resolve actions. | ◐ PageHeader applied; list/actions unchanged. |
| `/admin/review-reports` | Report list, resolve/hide/unhide review. | ◐ PageHeader applied; list/actions unchanged. |
| `/admin/highlights` | Slides, master switch, autoplay/interval, reorder, duplicate/delete, previews, warnings. | ◐ PageHeader applied; editor unchanged. |
| `/admin/banners` | Placement rows/CRUD; managed hero/highlights rows hidden with links. | ◐ PageHeader applied; CRUD unchanged. |
| `/admin/homepage-sections` | Read-only section list. | ◐ PageHeader applied; list unchanged. |
| `/admin/announcements` | List/CRUD. | ◐ PageHeader applied; CRUD unchanged. |
| `/admin/audit-logs` | Entity/action/actor filters and rows. | ◐ PageHeader applied; list unchanged. |
| `/admin/settings` | Group tabs, registry fields with help, unsaved bar, re-auth, history, storage health, read-only commission/highlights summaries. | ✅ AnimatedTabs (sliding indicator, URL `?group=`, reduced-motion) replacing the plain tab strip; all fields/history/re-auth/save bar retained. |

**Seller** (Phase 3, 2026-11-22)

| Page | What must remain | Phase 3 status / where it lives |
|---|---|---|
| `/seller/dashboard` | Application status/quick links; pending orders, unread notifications, unanswered questions, stuck orders, low-stock variants. | ✅ Application status + action queue + KPI strip (revenue/orders/AOV/delivered/commission/cancellations) + sales-trend tabs + orders by status + wallet snapshot + release calendar + COD dues gauge + top products + disputes deadlines + ratings + delivery + stock health + shop summary/quick links. |
| `/seller/products`, `/new`, `/[id]` | List with status/stock/low-stock and delete; editor basics, care, variants, images, status; stock adjustment. | ✅ PageHeader + server-prefetched stock-health strip + list (server-seeded). Editor unchanged. |
| `/seller/orders`, `/[id]` | Status tabs/counts and rows; detail items, customer/address, totals, history, transitions, delivery proof. | ✅ Period selector + KPI strip + status chart + sortable/density DataTable with mobile cards; first page server-seeded. Detail unchanged. |
| `/seller/earnings` | Available/pending/on hold/withdrawn/COD dues, per-order release dates, ledger with type filter, withdrawal dialog/history, payout-profile summary/link. | ✅ Balance composition donut, COD dues gauge vs limit, release calendar, AnimatedTabs (overview/transactions); wallet data server-seeded. Withdrawal/ledger/profile actions unchanged. |
| `/seller/payout-accounts` | Canonical masked destination list/add/delete with cooldown messaging. | ◐ PageHeader already; actions unchanged (no supporting series). |
| `/seller/complaints`, `/[id]` | Queue filters; thread, response text/photos, deadlines. | ✅ PageHeader + disputes health strip (open/due soon/avg resolution/status bars); list/thread unchanged. |
| `/seller/reviews`, `/seller/questions` | Review list/reply/report; question list/answer. | ✅ Reviews: PageHeader + rating distribution strip. Questions: PageHeader + list unchanged (no rating series). |
| `/seller/shop`, `/seller/delivery-zones` | Shop profile fields/logo/banner/vacation; zones CRUD. | ◐ PageHeader already; forms/actions unchanged. |
| `/seller/analytics` | Range selector, delivered/revenue/commission/AOV KPIs, rating, daily revenue bars, orders by status, top products, low stock. | ◐ Existing analytics charts retained (not rebuilt in this pass). |
| `/seller/cancellation-requests`, `/seller/apply` | Request queue/respond; onboarding wizard + approved notice. | ◐ PageHeader already; flows unchanged. |
| Notifications | Shared bell only; no seller page exists. | ◐ Unchanged (no seller notifications page). |

## 5. Phase 2 implementation notes

- Admin pages now use `PageContainer` + `PageHeader` (one `h1`) so the shell breadcrumb stays a
  non-heading label. Detail components keep their own single `h1`.
- The admin dashboard moved from bare text to KPI cards with sparklines/deltas, trend tabs, status
  distribution, payment mix, aging/health charts, settlement composition and top-list tabs. Every
  legacy number is still present (queue tiles + operations snapshot + legacy overview query).
- `GET /admin/orders?view=summary` is an additive projection: the list no longer downloads status
  history, payments or delivery proofs per row; `/admin/orders/:id` keeps the full response. The
  orders page is server-rendered for the first page (summary projection) so the LCP text no longer
  waits for a client round trip.
- Reconciliation now shows the bucket composition from the same panels source (all-time, matching the
  conservation total) plus the exact bucket table; the violations table is sortable and card-based
  below `md`.
- Queue/finance pages reuse one `AnalyticsStrip` (period + KPIs + one chart) so numbers match the
  dashboard for the same range. No new backend writes; no ledger/payment/commission rule changed.
- Settings groups use `AnimatedTabs`; the unsaved guard, re-auth flow, history and read-only summaries
  are unchanged.

## 6. Phase 3 implementation notes (seller panel)

- The seller dashboard uses the same kit and a server-prefetched seller panels response. It keeps every
  legacy counter (pending orders, stuck orders, unanswered questions, low stock, unread
  notifications), the application status card, shop summary and quick links, and adds the KPI strip,
  sales-trend tabs, status/action queue, wallet snapshot, release calendar, COD dues gauge, disputes
  deadlines, top products, ratings, delivery performance and stock health.
- Seller orders is server-seeded (first page + panels) and uses the shared DataTable; the status filter,
  pagination and detail actions are unchanged. Products is server-seeded as well and gets a stock-health
  strip. Wallet gets a balance-composition donut, COD dues gauge, release calendar and AnimatedTabs;
  withdrawal/ledger/payout actions are untouched.
- Health strips are shared (`SellerHealthStrip`) for complaints/reviews/products and use the same
  seller-scoped read-only panels endpoint, so numbers match the dashboard for the same range.
- Mobile: KPI/action strips are swipeable snap rails with a focusable region, page actions/buttons use
  larger targets, and no page overflows at 360.
- Server prefetch never becomes a second source of truth: failures fall back to the existing client
  loading/error states.
