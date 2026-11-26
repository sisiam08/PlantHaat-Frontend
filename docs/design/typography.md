# Typography, overflow and copy findings

Last verified: 2026-11-14 (production `:3100`) · Branch `redesign/phase2`. Consolidated from the former typography consistency/copy/inventory/overflow reports; raw JSON and element inventories were temporary evidence and are not committed.

## Current type system

- **Latin:** Inter (self-hosted, Latin subset). **Bangla:** Hind Siliguri 400/600 (self-hosted). `Kalpurush.ttf` is present in `frontend/public/fonts` but has no Bengali codepoints/GSUB-GPOS, so it is **not wired**; the Bangla stack lists it first only so it activates if a valid file is supplied later.
- Stack: `"Inter", "Hind Siliguri", "Hind Siliguri Fallback", "Noto Sans Bengali", ui-sans-serif` (Latin first so digits/Latin render in Inter and Bangla falls through).
- `font-synthesis: none`; no italics; hierarchy is weight + size, never a different family. Bangla headings 600/700, line-height 1.55, letter-spacing 0 (never negative tracking on Bangla).
- `font-display: swap` on every face; exactly one font preload per locale (bn → Hind Bengali 600, en → Inter variable). Metric-matched `Hind Siliguri Fallback` (Nirmala UI/Noto Sans Bengali, `size-adjust: 87%`).
- Prices use the single `<Price>` renderer: body font, 700, `tabular-nums`, taka sign before the amount, Latin digits. `৳`/Bangla digits fall through Inter → Hind.
- One date formatter: `formatLatinDateTime(value, locale)` (Latin digits, Asia/Dhaka, localized month words); `formatDateTime` is a deprecated alias.

## Verified state

- Computed-style + CDP `CSS.getPlatformFontsForNode` audit of **1,150 visible text elements** (300 style combos) across home/catalog/PDP/cart/checkout in bn/en: 0 italic, 0 non-`none` synthesis, 0 Fraunces/Tiro, 0 missing families. Only `Segoe UI Symbol` remains for a few symbol glyphs (`x`, stars) where icons/plain text were not used.
- `e2e/typography.spec.ts` enforces the same rules (no italic/synthesis/removed families; only Inter/Hind platform fonts) on home/catalog/PDP/cart in bn/en.
- Remaining: seller/admin table money still uses `formatBdt` strings (plain body font, not yet `<Price>`); public/cart/checkout/orders/wishlist use `<Price>`.

## Copy changes retained

| Change | Before | After | Why |
|---|---|---|---|
| Home rail link | "See all" | "View all" | One term for the same action |
| Login subtitle | "Sign in to your PlantHaat account" | "Log in to your PlantHaat account" | Button says "Log in" |
| Catalog retry | "Retry" | "Try again" | Matches shared `QueryError` |
| Rating filter | `Rated 4★ & up` | `Rated 4 stars & up` | Removes a symbol glyph fallback |
| Review distribution | `{count}★` | `{count} stars` | Stars come from the icon set |
| Rating labels | `{rating}★` | `{rating} / 5` | Unambiguous numeric rating |
| Active price chip | hard-coded symbol/digits | `Intl`-formatted amount | Locale-safe money |

Kept intentionally: "Add to cart" (not "Add"), "My orders" page title (nav stays "Orders"), "Checkout" as the cart action and "Place order" as the final checkout action. Bangla strings were already natural equivalents.

## Horizontal overflow

- Measured `document.documentElement.scrollWidth - clientWidth` at 1024/1280/1366/1440/1536/1920 on home, catalog, PDP, cart, checkout, seller dashboard and admin dashboard (bn + en for public/cart).
- Cause 1: `RailScroller` root sized to flex content (no `min-w-0`), pushing the right arrow outside. Fixed with `relative w-full min-w-0` on the rail wrapper.
- Cause 2: footer contact column min-content (unbreakable email) expanded the last grid track. Fixed with `[&>*]:min-w-0`, `min-w-0` on the contact list and `break-all` on phone/email links.
- Result: **0 overflowing combinations**; `e2e/overflow.spec.ts` 22/22 (six widths, bn/en, public + checkout/seller/admin). No `overflow-x:hidden` masking on `body`.
- Remaining: symbol glyphs may still use `Segoe UI Symbol`; this is a glyph fallback, not a text family, and causes no layout overflow.


## 2026-11-24 Taka subset broke Bangla conjuncts

- Root cause: the general `--font-sans`/`--font-bangla` stacks led with the 4-glyph `Taka` face
  (`U+0982, U+09AC, U+09BE, U+09F3`). Browsers fall back per glyph, so words containing ব/া (e.g.
  স্টক স্বাস্থ্য) mixed Taka glyphs with Hind Siliguri and lost the conjunct shaping (the word looked
  split). `Kalpurush.ttf` remains unwired and is not the cause.
- Fix: `Taka` is now only used by `.price-currency` (৳) and the `.bangla-label` two-word language
  control. All normal Bangla text uses `Hind Siliguri → Hind Siliguri Fallback → Noto Sans Bengali`;
  Inter stays first for Latin/digits. No wrapping rule was disabled.
- Verified at 390/1280 in the seller products health strip: computed family no longer contains Taka,
  the word is one shaped run (55.9 px vs the mixed 63.8 px before) and its screenshot is intact.
  Other compound/caret/ফলা words use the same single-family stack; no horizontal overflow.
