# Part 4 live verification report

Date: 2026-11-18/19. Isolated stack: API `:5001` (`planthaat_test`) + production frontend
`:3002`. Fake seed accounts/data only; no dev database or dev settings were written.

## Automated live run

Command (serial, desktop Chromium):

```powershell
$env:PAYMENTS_TEST_BASE_URL="http://localhost:3002"
$env:PAYMENTS_TEST_API_URL="http://127.0.0.1:5001"
npx playwright test e2e/part4-settlement.spec.ts --project=desktop-chromium --workers=1
```

Result: **1/1 passed** (56 s), including axe scans and 360 px overflow checks on the seller wallet,
buyer order detail and admin withdrawals page. Existing `payments-advance.spec.ts` re-ran on the
same stack: **12/12 passed**.

| # | Scenario | Result | Evidence / note |
|---|---|---|---|
| 1 | Advance paid + verified → seller delivers → buyer sees window → early release → seller withdraws → admin pays | PASS | `part4-settlement.spec.ts`; wallet screenshot at 1280/360 shows Pending → Available → Total withdrawn |
| 2 | Buyer confirms “Everything is fine” releases early | PASS | Same spec; confirm dialog; buyer panel changes to “Problem window closed” |
| 3 | Dispute with photo → seller response → admin partial refund + refund TrxID | PASS | Spec creates the dispute and decision; admin detail shows order summary, timeline, decision state |
| 4 | Dispute rejected returns funds | PASS | Backend settlement e2e (`test/settlement.e2e-spec.ts`); admin decision form exposes the option |
| 5 | Withdrawal rejected returns the reserve | PASS | Backend settlement e2e; admin reject form with reason is present |
| 6 | COD delivered creates dues; dues over limit block; admin records dues payment | PASS | Spec disables auto-deduction with re-auth, delivers COD, asserts the dues banner; backend e2e covers limit/block/manual payment |
| 7 | Minimum/pending-limit/cooldown errors shown | PARTIAL | UI maps the API codes to localized inline/toast messages; minimum + parallel-overdraw covered by backend tests. Cooldown/pending-limit not exercised through the UI in this run |
| 8 | Multi-shop order with partial cancellation refund | PASS | Existing `payments-advance.spec.ts` scenario 9 |
| 9 | Reconciliation balanced; breach alert | PARTIAL | Balanced state verified in UI + API. A forced breach was not created because deliberately corrupting the test ledger needs a separate destructive script; the backend conservation test covers the failure path |
| 10 | Permissions (buyer/seller/admin separation) | PASS | Backend role matrix test; existing access-control suites; Part 4 API rejects cross-role access |

Viewports/locales checked visually: seller wallet 1280 + 360 bn; buyer order detail 1280 + 360 bn;
admin withdrawals 1280 bn; admin dispute detail 1280 bn. English copy comes from the same keys and
message-coverage test.

## Bugs found and fixed in this session

| Severity | Finding | Fix |
|---|---|---|
| P1 | Bengali sidebar label/breadcrumb for Wallet/Withdrawals was corrupted (“???????”) | Corrected `seller.nav.earnings`, `admin.nav.withdrawals`, `admin.nav.complaints` |
| P1 (a11y) | Inactive wallet tabs failed colour contrast (axe `color-contrast`) | Tabs use full foreground colour; axe now clean |
| P2 | 360 px pages overflowed ~5 px from the shared header controls | Reduced mobile header padding/gaps and logo text size; `scrollWidth == clientWidth` at 360 |
| P2 | Admin withdrawal “balance at request” rendered raw `2015.00` | Rendered through `<Price>` |
| P2 | Admin dispute detail had no shop/order summary and showed raw decision enum | Backend detail now includes shop + shop order summary; UI localizes the decision |
| P2 | Evidence was only an external link | `@/components/ui/dialog` lightbox for evidence photos |
| P2 | Admin ledgers would show missing labels for new account entry types | Added all Part 4 entry types to `admin.ledgerType` |

## Remaining gaps / not verified

- Realtime socket in the test stack still points at `ws://localhost:5000` and CSP blocks it
  (`connect-src` allows `:5001`); this is an existing test-stack env issue, not a Part 4 screen bug.
- Admin destinations are masked only. The API does not return the full account number, so an
  admin-side reveal/copy is intentionally not implemented.
- Dispute list supports status filters only; seller/age/amount filters would need API support.
- A forced reconciliation breach was not destructive-tested live; the automated invariant test and
  UI breach banner code path exist.
- Orders delivered before Part 4 are “legacy-settled” and do not get a return window in the UI; use
  new orders for owner testing.
