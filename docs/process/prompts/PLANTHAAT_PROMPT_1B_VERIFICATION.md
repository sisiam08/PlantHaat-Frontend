# PlantHaat — Prompt 1B: verify and tighten Prompt 1 (delivery charge) before building on it

Your Prompt 1 report says the frontend build, Playwright and axe were not run, the full backend unit
suite and the second Vitest run did not finish, and the UI was typechecked but never driven in a
browser. Nothing new should be built on top of that. This task is **verification and fixes only**. Do
not start booking, pickup, webhooks, tracking or settlement.

## Read first
`AGENTS.md`, `frontend/docs/FRONTEND_CONTEXT.md` (sections 9 and 13 for how to run things), your own Prompt 1 report and its migration `20261126120000_courier_delivery_quotes`, and `backend/docs/decisions-log.md`.

## How to run (use what the repo already documents; do not exceed tool time limits)
- Backend full unit suite: run with limited workers and in the background if the environment kills long processes; if it still cannot finish, run it in slices (per module folder) and report each slice.
- Frontend Vitest: `--maxWorkers=1` (documented earlier: default concurrency causes false 5 s timeouts).
- Frontend production build into a throwaway dir (`NEXT_DIST_DIR=.next-prod npm run build`), started in the background and polled, not awaited in one blocking call.
- Browser checks: the isolated test stack (`backend/scripts/test-stack.ps1`, API :5001, production frontend :3002), real Chrome, never dev settings. Delivery quotes must use `delivery.quote.live.enabled=false` with override and fallback rows seeded for the test; do not call the real Steadfast endpoint in automated tests.

## 1. Run everything that was skipped, and report exact results
Backend: typecheck, lint, full unit suite (or slices), the delivery-quote and checkout e2e suites. Frontend: typecheck, lint, Vitest (maxWorkers=1), production build. Playwright with axe at 360 and 1280, bn and en, on: cart (guest and logged in; Dhaka with and without thana; non-Dhaka; one shop and two shops with different pickup districts), checkout (address form with the thana select; a saved Dhaka address with no thana prompts before quoting; COD_ONLY and ADVANCE_ONLY intersection), seller product editor (weight and extra-charge fields with the live example), seller shop settings (pickup thana), `/seller/delivery-zones`, admin `/admin/delivery-rates`, admin shop-order detail snapshot. Check horizontal overflow, console errors and failed requests on each. Fix what you find.

## 2. Confirm that these items from the Prompt 1 spec exist, or build them
Your report did not mention them. For each one, say "present (file)" or implement it:
- the 1 request per second global limit with a small queue, 3 s timeout, `Retry-After` handling and the circuit breaker (5 failures, 5 minutes) for live quotes;
- de-duplication of concurrent identical live fetches;
- the warm-up action (admin, and when a shop's pickup location is saved), only when the live switch is on;
- CSV export and import of override rows with a validated **dry-run preview** before applying;
- the District → Steadfast mapping table and the Dhaka thana-zone editor in `/admin/delivery-rates`, with unmapped rows and `DEFAULT_UNVERIFIED` highlighted;
- `DELIVERY_CHARGE_CHANGED` (409) handled in the checkout UI with a clear message and the new amounts, not a generic error;
- guest cart with district (+ thana for Dhaka) and no login.

## 3. Thana list clean-up (the seeded Steadfast list contains entries that are not real thanas)
Your Dhaka list includes "Zone Not Clear", "Battery Section", "Shah Ali Market" and "Kadamtali (two ids)". Do not delete anything. Add `selectableByCustomer` (default true) and set it false for entries that are clearly not an address-level thana ("Zone Not Clear" at minimum). List every other entry you think is not address-like for owner review. For duplicated names, show the Steadfast id in the admin editor and de-duplicate in the customer select by name while keeping both ids resolvable. Customers and sellers must never be offered "Zone Not Clear".
Also list, without changing them, the Dhaka-district thanas you seeded as CITY that sit on the city's edge (for example Turag, Uttarkhan, Dakshin Khan, Purbachal, Demra, Azompur, Shyampur, Kamrangirchar) so the owner can ask Steadfast about each. The boundary stays `DEFAULT_UNVERIFIED`.

## 4. The "0 means unset" fallback trap
With the live switch off, no overrides and no cache, every route gives `NO_RATE` and checkout is blocked. That is correct, but it must be obvious: add an admin warning card on `/admin/delivery-rates` ("No rate source is configured: checkout is blocked for these routes") that shows whether the live switch is off, whether fallbacks are unset, and how many cache or override rows exist. In the seller shop and delivery pages, show sellers a neutral message if their shop cannot quote because of a missing pickup thana or an unconfigured platform rate, never a zero.
Also confirm the settings registry rejects negative values and non-integers for the two fallbacks, and that "unset" is stored distinctly from a real zero if the registry allows that (otherwise document the limitation).

## 5. Naming
Your report calls the settlement work "Prompt 4". The plan is: Prompt 2 = courier connection, booking, pickup, webhook/polling, status mapping; Prompt 3 = settlement, dues, hiding products at the dues limit, advance totals, reconciliation; Prompt 4 = tracking UI, manual-seller tracking fields, dashboards. Fix the wording in your docs and open items.

## Final report
What ran with real outcomes; what failed and how you fixed it; what is still not verified and why; the edge-of-city thana list; the non-address thana list; files changed. No commit or push.
