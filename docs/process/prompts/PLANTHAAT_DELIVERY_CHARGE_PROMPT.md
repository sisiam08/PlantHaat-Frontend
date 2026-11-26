# PlantHaat — Prompt 1 of 4: Courier-based delivery charge (cart and checkout)

You are working in the PlantHaat workspace (backend NestJS/Prisma/PostgreSQL, frontend Next.js).
This is the first of four prompts for the Steadfast Courier integration. It covers ONLY how the
delivery charge is calculated and shown. Booking, pickup, webhooks, tracking and settlement are
later prompts. Do not start them.

## Read first
- `AGENTS.md`, `frontend/docs/FRONTEND_CONTEXT.md`, `frontend/docs/FRONTEND_DESIGN.md`
- `backend/docs/BACKEND_CONTEXT.md`, `backend/docs/payments/api.md`, `backend/docs/settings/reference.md`
- Your own report of the 2026-11-24/25 delivery-conditions work (migrations `20261124150000_delivery_conditions` and `20261125120000_backfill_delivery_conditions`). That work is the base. Inspect the real code and DB, do not trust this prompt's summary of it.
- `steadfast-districts.csv` (provided with this prompt; copy it to `backend/prisma/seed-data/steadfast-districts.csv`)

Rules that stay in force: server is authoritative for prices and totals; money is an opaque decimal
string on the client; light mode only; all UI text via next-intl (bn default, en); Latin digits and the
taka sign before amounts; shadcn via CLI; no hard-coded hex; no new dependency without a logged reason;
no fake data. Do not commit or push unless asked. Log decisions in `backend/docs/decisions-log.md` and
progress in `backend/docs/progress.md` (append, no new progress files).

## Business rules (decided by the owner — implement exactly)
1. The delivery charge shown to the customer per shop = **courier charge** (Steadfast pricing) + **seller extra charge**.
2. The courier charge comes from Steadfast's public pricing quote, for **every** seller whether or not the seller will later connect a Steadfast API key. Source of truth order: live quote (cached) → admin override → admin fallback flat charge.
3. Each shop is a separate parcel: one quote per shop, from the shop's pickup location to the customer's delivery location.
4. The customer pays exactly the amount shown at checkout. Whatever the courier actually bills later (weight measured at the hub, negotiated rates) is the seller's gain or loss. Never show a "plus possible extra" to the customer.
5. Seller extra charge is set **per product** by the seller: `extraChargeAfterQty` (the quantity after which extra applies) and `extraChargePerUnit` (taka per additional unit). Example: threshold 10, 10 tk each, 13 in cart → 3 × 10 = 30 tk extra. The shop's extra = sum over its product lines (each line independent). Both fields optional; if either is empty the product has no extra.
6. Seller may also set an optional product `weightKg` (packed weight incl. packaging). Shop parcel weight = Σ(weightKg × qty) for lines that have it; if no line has a weight, use 0.5 kg. Round up to the next 0.5 kg step (cap 600). That weight is sent to the quote.
7. Free delivery stays as an optional **seller-funded** offer: `freeDeliveryEnabled` (default **false** for everyone, including migrated shops) plus the existing threshold. When enabled and the shop subtotal reaches the threshold, the customer's delivery charge for that shop is 0. The courier cost is then the seller's. Label it clearly in the seller UI.
8. Keep what already exists: per-shop `paymentMode` (COD_AND_ADVANCE / COD_ONLY / ADVANCE_ONLY), ETA, the intersection logic for method availability, and backend enforcement `PAYMENT_METHOD_NOT_AVAILABLE`. The seller-set `charge` field of the Inside/Outside-Dhaka conditions is **no longer used for quotes** (see Migration).
9. The delivery charge is never shown on the product page (already removed). Only cart and checkout.

## What Steadfast gives us (verified by the owner)
Public endpoint, no login: `GET https://steadfast.com.bd/pricing/quote?from=<id>&to=<id>&category=1&weight=<kg>&service=1&delivery=0&cod=0`

Example response: `{"charge":65,"available":true,"express_off":null,"lane":"inside_dhaka","card":"isd","base":null,"weight_extra":0,"options":{"home":65,"point":50,"express":110},"cod":null}`

- `from`/`to` are Steadfast location ids: see `steadfast-districts.csv`. Dhaka is split into **1 = Dhaka City** and **18 = Dhaka Sub-Urban**; Gazipur (14), Narayanganj (13), Munshiganj (35), Manikganj (32), Narshindi (10) are separate entries. Id 25 is unused. There is no plain "Dhaka" entry.
- `category=1` regular, `service=1` regular, `delivery=0` home delivery. We only use these values. `weight` accepts 0.01–600.
- `charge: null` or `available: false` means the route is not served. With `delivery=0`, `charge` should equal `options.home`; if they ever differ, use `options.home` and log the case.
- `base` is non-null only when a weight surcharge applies (`charge = base + weight_extra`).
- **This endpoint is undocumented and not an official API.** The owner has asked Steadfast for permission and a stable alternative; the answer is pending. Therefore: it is behind an admin switch **`delivery.quote.live.enabled` that defaults to false**, and the system must work well with it off (admin override + fallback). Never call it from the browser. Send a clear `User-Agent: PlantHaat/1.0 (+<support email from env>)`, `Accept: application/json`; do not pretend to be a browser. Respect 429/`Retry-After`, timeout 3 s, at most 1 request per second globally with a small queue, circuit breaker (open after 5 consecutive failures for 5 minutes), never block a cart request on the network if a cached/stale value exists.

## Data model (additive migrations only; never edit or drop existing data)
- `SteadfastLocation` (id int PK = Steadfast id, name, kind: DISTRICT | DHAKA_CITY | DHAKA_SUBURBAN) seeded from the CSV. Provide a deterministic **District → SteadfastLocation** map for every one of our `District` rows by normalized name with an explicit override table for known spelling differences (Bogura/Bogra, Chattogram/Chittagong, Narsingdi/Narshindi, Jashore, Kushtia/Kustia, Cumilla, Barishal, Khagrachhari/Khagrachori, Satkhira/Shatkhira, Moulvibazar, Chapainawabganj, Jhalokati, Cox's Bazar, Lakshmipur/Laxmipur, Laxmipur). **Do not guess**: any district without a confident match is listed in the report and left unmapped (quote unavailable for it, admin can map it).
- Our `District` for Dhaka maps to **either 1 or 18 depending on the thana** (see next point). All other districts map one-to-one.
- `Thana` table seeded from Steadfast `GET https://portal.packzy.com/api/v1/police_stations` (headers `api-key`, `Secret-Key`; credentials only from env `STEADFAST_LOOKUP_API_KEY` / `STEADFAST_LOOKUP_API_SECRET`, never committed). Write a script `npm run db:seed:thanas` that fetches and writes `prisma/seed-data/steadfast-thanas.json` (committed, contains no secrets) and an idempotent seeder that reads that JSON. Fields: `steadfastPoliceStationId`, name, our districtId (via the map), `dhakaZone` (CITY | SUBURBAN | null).
- **Dhaka classification:** Steadfast prices Dhaka City and Dhaka Sub-Urban differently, and no source lists which thana is which. Seed every Dhaka-district thana as `CITY` except thanas belonging to Savar, Dhamrai, Keraniganj, Nawabganj and Dohar upazilas which seed as `SUBURBAN`, all marked `classificationSource = DEFAULT_UNVERIFIED`. Make it admin-editable. In your report, list every Dhaka-district thana with its seeded zone so the owner can review.
- `Address.thanaId` (nullable FK) — required **only** when the address district is Dhaka; optional elsewhere. Same for the shop: `Shop.pickupThanaId` (required to get a quote for Dhaka shops). Existing rows stay null; handle null gracefully (see edge cases).
- `Product.weightKg` (nullable decimal), `Product.extraChargeAfterQty` (nullable int ≥ 1), `Product.extraChargePerUnit` (nullable decimal ≥ 0, whole taka).
- `ShopDeliveryZone` (the condition rows from your previous work): add `freeDeliveryEnabled boolean default false`. Existing `charge` stays in the table, unused for quotes (do not drop).
- `CourierQuoteCache` (fromSteadfastId, toSteadfastId, weightStep, charge nullable, available, lane, base nullable, weightExtra, fetchedAt, source LIVE | IMPORTED | ADMIN, `isOverride boolean`). Unique (from, to, weightStep). Stale-while-revalidate: fresh for 24 h, usable-stale for 30 days, and a stale row is always preferred over a fallback. Admin override rows (`isOverride=true`) always win and are never refreshed automatically.
- Snapshot on the order's shop-order delivery data (additive nullable columns): `courierCharge`, `sellerExtraCharge`, `parcelWeightKg`, `courierLane`, `quoteSource`, `quoteFetchedAt`, `freeDeliveryApplied`. Historical orders stay untouched; the existing `deliveryCharge` total remains the amount the customer paid.

## Quote service (backend, one module `delivery-quote`)
`DeliveryQuoteService.quoteShop({ shop, address, lines, subtotal })` returns `{ available, courierCharge, extraCharge, total, weightKg, lane, source, estimated, reason? }` where `source` ∈ LIVE | CACHE | STALE | OVERRIDE | FALLBACK. Resolution:
1. Resolve the pickup SteadfastLocation (shop district; Dhaka via `pickupThanaId`) and the delivery SteadfastLocation (address district; Dhaka via `thanaId`). Missing pieces → `available:false`, `reason: ADDRESS_THANA_REQUIRED | SHOP_PICKUP_INCOMPLETE | DISTRICT_UNMAPPED`.
2. Compute the weight step and the cache key; look up override → fresh cache → (if `delivery.quote.live.enabled`) live fetch (de-duplicated: concurrent identical requests share one fetch) → stale cache → admin fallback flat charge (`delivery.fallback.insideDhaka` / `delivery.fallback.outsideDhaka`, new admin settings). Keep the rule simple: use `insideDhaka` when both SteadfastLocation ids are 1 (Dhaka City to Dhaka City); otherwise use `outsideDhaka`. If the matching fallback is unset → unavailable with `reason: NO_RATE`.
3. Add the seller extra (rule 5), apply free delivery (rule 7), and return.
Never trust the client for any of this input except district/thana ids; recompute everything at checkout and at order creation, and make order creation fail with a clear error code if the total changed since the cart (`DELIVERY_CHARGE_CHANGED`, with the new amounts) instead of silently charging a different amount.

A background warm-up job (low priority, respects the 1 req/s limit, only when the live switch is on): when a shop's pickup location is saved, pre-fetch quotes for that pickup × every Steadfast destination at 0.5 kg. A manual admin action does the same on demand.

## Cart and checkout
- Cart is already district-scoped. Extend the existing query with `thanaId` (guests too): guests pick district (+ thana if Dhaka) without logging in. Until a district (and thana when needed) is chosen, show a calm prompt in each shop group instead of a number.
- Per shop show: delivery charge (single amount), ETA, and a small expandable line "Courier X + seller extra Y" only if extra > 0. Show "Free delivery" when rule 7 applies. If `available:false`, show the localized reason with the fix action (choose thana, change address) and block checkout for that shop; never a zero charge.
- Checkout address form/Address book: add the thana select (Steadfast thana list, bn/en names where available, searchable) shown **only** when the district is Dhaka. Saved Dhaka addresses without a thana must prompt the user to add it before the quote works.
- All totals and the payment-method intersection keep working. COD amount and advance amount both use the new total; the existing `Idempotency-Key` behaviour is unchanged.
- No loading flicker: reserve space, keep stale numbers with a subtle "updating" state while revalidating, and handle the quote service being slow without blocking cart quantity changes (existing debounce/latest-wins logic must keep working).

## Seller UI
- Product editor: new optional fields `weightKg` (with helper text "packed weight including pot and packaging, in kg"), `extraChargeAfterQty` and `extraChargePerUnit` with a live example line ("13 in cart → 3 × 10 = 30 tk extra"). Validation server-side.
- Shop settings: pickup thana select (required for Dhaka-district shops), with a warning banner in the seller dashboard and on `/seller/delivery-zones` if missing.
- `/seller/delivery-zones`: remove the courier-charge input; keep ETA, payment mode, the free-delivery toggle (default off) with the threshold, and an info card: "Delivery charge is set by the courier rate. Anything the courier bills beyond what the customer paid is deducted from your balance; if you offer free delivery you pay the whole charge." (bn/en). Do not delete old data.
- Show on the seller's product page a small read-only "what customers pay" preview only if cheap to build; otherwise skip.

## Admin
- Settings (registry + docs in `backend/docs/settings/reference.md`): `delivery.quote.live.enabled` (default false), `delivery.fallback.insideDhaka`, `delivery.fallback.outsideDhaka`, `delivery.quote.cacheFreshHours` (24), `delivery.quote.staleDays` (30).
- New admin page `/admin/delivery-rates` (use the dashboard kit and `PageHeader`): cache table with filters (from, to, source, stale), manual override create/edit/delete, CSV export/import of override rows (validate hard; dry-run preview before applying), health card (live switch state, last success, last error, circuit state, requests today), a thana-zone editor for Dhaka (CITY/SUBURBAN, shows `DEFAULT_UNVERIFIED`), the District→Steadfast mapping table with unmapped rows highlighted, and a "warm up pickup" action.
- Admin orders/shop-order detail: show the snapshot (courier charge, seller extra, weight, lane, source, free-delivery applied).

## Migration of the previous work
- Do not delete or alter the seller-entered charges/thresholds. Add `freeDeliveryEnabled=false` to all existing zone rows (thresholds prefilled stay, disabled). Existing carts/orders continue to work; existing orders keep their stored amounts.
- The legacy `District.insideDhaka` flag may remain for the payment-mode intersection, but must not be used for pricing.

## Edge cases that must have tests
Dhaka address without thana; shop without pickup thana; unmapped district; `charge:null`/`available:false`; endpoint timeout, 429 with `Retry-After`, 5xx, invalid JSON, circuit open; live switch off with empty cache (fallback), with stale cache (stale used), with override (override wins); two concurrent identical quotes (one fetch); weight rounding (0.5, 0.51, 1.0, 600+ capped); threshold exactly at quantity; extra with multiple lines; free-delivery threshold exactly met; quote changes between cart and order (`DELIVERY_CHARGE_CHANGED`); guest district picker; address change updates fees and method availability; price display in bn with Latin digits; a different seller with a different pickup district in the same cart; COD_ONLY/ADVANCE_ONLY intersection still enforced.

## Verification (state exactly what ran and what did not)
- Backend: typecheck, lint, unit tests, targeted e2e on the isolated test stack (never dev settings). Mock the Steadfast endpoint in tests; **do not hit the real endpoint in automated tests**. One manual live check is allowed, at most 10 requests, logged.
- Frontend: typecheck, lint, Vitest, build; Playwright with real Chrome at 360 and 1280, bn and en: cart (guest and logged in, Dhaka and non-Dhaka, multi-shop), checkout address with thana, seller product editor, seller delivery zones, admin delivery-rates; axe on touched pages; no horizontal overflow; console and network clean.
- Update `design/dashboard-guide.md`/page inventory only if you touch dashboard pages; keep the bundle checks green.

## Final report
Summary of behaviour; files changed; migrations; the Dhaka thana → zone list for owner review; the unmapped districts list; settings added; test and check results with real outcomes; anything not verified; risks; and the open items below.

## Open items to log (do not decide silently)
1. Steadfast's permission for the public quote endpoint is pending — keep `delivery.quote.live.enabled=false` in production until the owner turns it on.
2. The Dhaka City vs Sub-Urban thana boundary is unverified.
3. Negotiated merchant rates may differ from the public quote; the difference is the seller's by owner decision.
4. Prompts 2–4 (booking/pickup/webhook, settlement and dues, tracking UI) are not part of this task.
