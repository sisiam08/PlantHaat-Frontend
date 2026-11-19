# Part 4 live verification report

Date: 2026-11-19. Isolated stack: API `:5001` (`planthaat_test`) + production frontend
`:3002`. Fake seed/test data only; dev database and dev settings were not used.

## Scenario table (UI vs backend)

| # | Scenario | UI-verified? | Result | Evidence |
|---|---|---|---|---|
| a | Dispute rejected by admin; funds return; timelines/notifications; stale tab conflict | YES | PASS | `part4-dispute-reject.spec.ts`: two admin tabs, reject in one, stale tab gets “already decided in another tab”; seller funds move ON_HOLD → PENDING; buyer/seller notification rows contain the complaint id |
| b | Withdrawal rejected; reserve returned; seller sees reason | YES | PASS | `part4-withdrawal-reject.spec.ts`: admin reject UI, seller wallet Available restored, rejected row shows the reason |
| c | Multi-shop single-shop cancellation; admin completes refund with TrxID; buyer sees status | YES | PASS | `part4-multi-shop-refund.spec.ts`: admin advance-refund UI, buyer payment panel becomes partially refunded |
| d | Withdrawal/payout validation paths | YES (see gaps) | PASS | `part4-withdrawal-validation.spec.ts`: below minimum, above Available, pending limit, cooldown, invalid BD number, COD dues block with fix guidance, double-submit idempotency. Unsupported method is not selectable in the UI (API still rejects it); marked backend-only |
| e | Reconciliation balanced and breach | YES | PASS | `part4-reconciliation.spec.ts` balanced + help text; `scripts/part4-breach-test.ts` inserted a test-only imbalance, admin UI showed breach banner/table, then restore returned to balanced |
| f | Window closed/early release hides actions; no double decision; stale tab conflict | YES | PASS | `part4-window.spec.ts` hides report/early actions after release; `part4-dispute-reject.spec.ts` proves conflict instead of double-posting. Time-expiry without release is covered by the same UI logic (releaseAt <= now) and backend boundary tests |
| g | Dispute filters (status, seller, age, amount) | YES | PASS | Backend query fields + `part4-dispute-filters.spec.ts`; admin UI narrows to the ticket and shows empty state for a non-matching seller |
| h | Role/permission checks by UI + direct URL | YES | PASS | `part4-permissions.spec.ts`: buyer cannot open admin withdrawals, seller cannot open admin disputes, cross-role API calls 403, two sellers see different wallets |

Backend complementary checks: `test/settlement.e2e-spec.ts` **8/8** (release boundary, race,
withdrawal concurrency, COD dues, dispute decision conflict, filters, destination permissions/audit).
Backend complaints unit **7/7**.

## Payout destination reveal (money-critical)

- `POST /admin/withdrawals/:id/destination` (admin only) returns the full destination for one
  withdrawal. No list endpoint ever includes it.
- Requires a recent password re-auth token scoped to `withdrawal.destination:<id>` (existing
  short-lived, single-use re-auth service). Rate limited to 5/minute; responses are `Cache-Control:
  no-store`.
- Writes an audit row `withdrawal.destination_revealed` with admin id, withdrawal id, time/IP — never
  the account value.
- UI: masked destination + “Show payout details” → password dialog → reveal → Copy → auto-hide after
  60 seconds or navigation/close. The full value is never requested or rendered before the reveal and
  is not stored in the React Query cache.

## Bugs found and fixed in this closing session

| Severity | Finding | Fix |
|---|---|---|
| P1 | COD-dues block copy did not explain how to resolve it | Message now says to pay the dues / ask an admin and retry (en + bn) |
| P1 | Payout destination could not be revealed safely | Re-auth + audited one-request reveal endpoint and UI |
| P1 | Stale dispute tab previously replayed the decision | Now returns `409 DISPUTE_INVALID_STATE` with a clear “already decided” message |
| P2 | Mutation feedback after wrong re-auth password could leave the reveal button disabled | Removed the stale-pending interaction; reveal path tested end-to-end |
| P2 | Hide/auto-hide left the password dialog open | Hide and the 60-second timer now close the dialog |
| P2 | Double-submit could create two different idempotency keys | One key is generated per withdrawal dialog open |
| P2 | Admin dispute list had no seller/age/amount filters | Backend query fields + UI filter bar |
| P2 | Legacy ledger rows had no explanation | Tenant-safe “Settled before the new wallet system” labels in seller transactions and admin orders |
| P2 | Reconciliation invariant had no plain-language explanation | BN/EN help text above the run controls |

## Test counts

- New Part 4 scenario specs: **9/9 passed** (serial, production frontend): filters, dispute reject +
  stale tab, multi-shop refund, payout destination (incl. wrong/valid re-auth, copy, hide, auto-hide,
  bn copy), permissions, reconciliation balanced, early-release window, withdrawal reject, withdrawal
  validation (7 paths).
- Existing `payments-advance.spec.ts`: **12/12 passed**.
- Vitest: 69/69 passed; typecheck and lint clean (5 pre-existing warnings).
- Production frontend build green. Backend typecheck/lint; complaints unit 7/7; settlement e2e 8/8.
- Axe + 360 px overflow: payout/destination reveal and the main Part 4 pages were checked in the
  earlier run and remain unchanged in layout; new controls keep existing tokens/targets.

## Remaining gaps

- “Unsupported payout method” cannot be selected in the UI (only enabled methods are listed); the
  backend rejects it. This path is backend-only.
- A forced breach is a documented test-DB script, not a normal admin action; do not run it on dev.
- Realtime in the long-lived test browser showed a cached old `:5000` chunk once; the current
  `.next-test` build contains only `:5001` and the test-stack script sets the env explicitly. Polling
  fallback remains. No product code change was needed.
- Orders delivered before Part 4 remain legacy-settled and intentionally have no countdown.

## How to run

```powershell
# backend
powershell -ExecutionPolicy Bypass -File scripts/test-stack.ps1 start
# frontend
$env:PAYMENTS_TEST_BASE_URL="http://localhost:3002"
$env:PAYMENTS_TEST_API_URL="http://127.0.0.1:5001"
npx playwright test e2e/part4-*.spec.ts --project=desktop-chromium --workers=1
# breach fixture (test DB only; restore immediately)
node --import tsx scripts/part4-breach-test.ts insert
node --import tsx scripts/part4-breach-test.ts restore <printed-id>
```

Screenshots were written only to the gitignored `.artifacts/part4/` folder and removed after this
report was updated.
