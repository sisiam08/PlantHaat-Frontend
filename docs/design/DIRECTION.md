# PlantHaat — 2026 Redesign Direction

**Status:** Approved and implemented on `redesign/phase2` (batches A–G + consistency/QA passes, 2026-11-13 → 2026-11-18). Kept as the design rationale; live decisions and deviations are in `../FRONTEND_CONTEXT.md` and `backend/docs/progress.md`.
**Scope:** visual identity, type, tokens, motion, hero, home rhythm, product card, shell.
**Supersedes:** the "Direction guardrails" section of the Phase 1 audit.
**Binds:** `AGENTS.md`, `../FRONTEND_DESIGN.md` (except where this document explicitly amends it), `../FRONTEND_CONTEXT.md`, light-only, BFF architecture, no changes to cart/pricing/payment/API logic.

**Change log:** 2026-11-13 — owner update: **3D is out of scope.** No `three`, `@react-three/fiber`, `@react-three/drei`, GLB assets, or 3D capability detection. Hero depth is 2.5D only (transparent cutouts on 2–3 planes + scroll-linked parallax). The saved performance budget is reallocated to product-photo treatment, typography, section rhythm, and micro-interactions.

---

## 1. The direction: **Living Herbarium**

**Botanical Organic (dominant) × Warm Editorial (discipline).**

PlantHaat should feel like a botanist's specimen sheet that learned to sell: pressed-leaf textures, bone paper, deep forest ink, marigold price tags, hand-set display type — arranged with the rigor of a magazine feature, not the uniformity of a product grid. The catalogue is the brand; the marketplace lives inside it.

Why this fits plants and Bangladesh:

- **Plants are specimens, not SKUs.** A herbarium sheet gives every plant a name, a provenance, and a reason to be looked at. That grammar makes a 60-product catalogue feel curated instead of dumped.
- **It is honest to the product.** Real leaf silhouettes, real product photography, and real seller information carry the design; no glow blobs, no fake trust numbers, no purple gradients.
- **It fits the local visual culture.** Warm paper, deep green ink, and marigold are the colours of seed packets, nursery signage, and Bangla print. The palette reads premium on a mid-range Android screen without needing brightness or saturation tricks.
- **It forces mobile discipline.** Editorial hierarchy survives small screens because it is built from type scale, spacing, and contrast — not decoration. Dense 2-up cards and server-rendered rails keep the payload down.

Visual signatures to execute consistently:

1. **Bone paper base + cream bands + white product surfaces.** Sections alternate; importance is visible before reading.
2. **Display type with optical contrast.** Large, tight (Latin only) Fraunces headlines against calm Inter/Hind Siliguri UI.
3. **Specimen framing.** Product images sit in off-white "plates" with a 1px warm hairline and a tinted shadow — never a floating rounded rectangle on a gradient.
4. **One marigold action per region.** Everything else forest/outline/ghost.
5. **Motion is growth, not bounce.** Things rise, unfurl, and settle in 250–700 ms. No springy toys in the storefront; one spring, reserved for cart/press feedback.
6. **One memorable moment per viewport.** Home: the layered hero. Catalogue: the card → variant-sheet interaction. PDP: the image plate lifting into the gallery.

**Restraint line:** no glow, no glassmorphism beyond the header, no animated gradients, no blob `border-radius`, no more than one ambient loop, no emoji, no 3D.

---

## 2. Reconciliation with the generated design system

`ui-ux-pro-max --design-system --persist` produced a **Vibrant & Block-based / Feature-Rich Showcase** system with a mint-green `#059669` palette and Rubik + Nunito Sans. That output is a generic e-commerce default and contradicts the owner's brand and `../FRONTEND_DESIGN.md` §6.1.

**Decision:** keep the generator's structural guidance (section rhythm, one CTA per region, strong hover, scroll-snap, anti-patterns) and **override its colour, type, and style-noun choices** with this document. `MASTER.md` will be rewritten to match PlantHaat in batch B, retaining its anti-pattern and pre-delivery checklists.

Adopted from the generator: scroll-snap rails, 48px+ section gaps, 200–300 ms hover transitions, one message per card, hero + post-section + bottom CTA placement, "no flat design without depth".

Rejected: the mint/orange palette, Rubik/Nunito, the literal "feature grid of 4–6 cards" home pattern (replaced by the hero + bento + rails rhythm below).

---

## 3. Typography

| Role | Family | Weights / axes | Why |
|---|---|---|---|
| Display (Latin) | **Fraunces** | variable `opsz 9–144`, `wght 400–700`, `SOFT 0–100`, `WONK 0/1` | Soft old-style serif with organic curves and real optical contrast. Reads as a nursery catalogue / botanical plate, not SaaS. The WONK axis gives hand-set character at display sizes only. No Bengali glyphs — Bangla falls through to Tiro. |
| Display (Bangla, h1/h2 only) | **Tiro Bangla** | 400 | A Tiro Typeworks serif with genuine Bangla shaping and enough stroke contrast to hold at 40–80 px. One 86 KB Bengali subset, versus **191 KB** for Noto Serif Bengali variable; at display sizes the hierarchy comes from size and spacing, not synthetic weight. Noto Serif Bengali was evaluated and rejected on payload. |
| UI + Latin body | **Inter** (already self-hosted) | 400 / 500 / 600 / 700 + `tabular-nums` | Dense UI, prices, tables, order numbers. Never used as the display face. |
| Bangla body | **Hind Siliguri** (self-hosted) | 400 / 500 / 600 / 700 | Real Bangla weights, correct conjunct shaping, proven in the current app. Body/UI only — never the display face. |
| Bangla fallback | **Kalpurush** | Regular | Kept in the stack as the prompt requires. The current `public/fonts/Kalpurush.ttf` has no Bengali codepoints/GSUB (verified in `../FRONTEND_CONTEXT.md` §8), so Hind Siliguri renders Bangla until the owner supplies a working TTF. |

Rules:

- Stack: `--font-heading: "Fraunces", "Tiro Bangla", "Hind Siliguri", Georgia, serif`; `--font-sans: "Inter", "Hind Siliguri", "Kalpurush", system-ui, sans-serif`; `--font-bangla: "Hind Siliguri", "Kalpurush", system-ui, sans-serif`. Because Fraunces has no Bengali glyphs, Bangla in a heading falls through to Tiro Bangla automatically — no per-locale component branching.
- **Bangla display (h1/h2) uses Tiro Bangla 400 only.** Set `font-synthesis-weight: none` on headings so a requested `font-weight: 700` is not faked for Bangla; Latin still renders Fraunces 700. Build Bangla hierarchy with size, colour, and spacing (design §6.6).
- **Bangla body/UI is Hind Siliguri**, never Tiro; Tiro is display-only (large sizes). Never apply negative letter-spacing to Bangla. Latin display may use `letter-spacing: -0.02em` at ≥ 40px.
- Body line-height 1.6; Bangla body 1.65; Bangla display 1.5–1.6 (never `leading-tight`).
- Prices, order IDs, stock counts: Inter with `font-variant-numeric: tabular-nums`; Bangla digits via `Intl` (`bn-BD`).
- Fallback metrics: add `size-adjust`/`ascent-override` for Fraunces and Tiro so the swap does not shift hero headings (CLS guard).
- **Assets to add in batch B:** `public/fonts/fraunces-latin-var.woff2` (67,304 bytes) and `public/fonts/tiro-bangla-bengali-400.woff2` (86,088 bytes) — both OFL, self-hosted, no runtime external host. Preload Fraunces + Tiro on the home route only (the hero is the sole LCP text risk); other routes load them via `font-display: swap` as used.
- No new body face: Inter + Hind Siliguri are retained, so the change adds exactly two display files (153 KB total, cacheable, display-only).

---

## 4. Token evolution (Appendix B v2)

All existing semantic names are preserved; only values change, plus a few layout/motion primitives. No component may hard-code a new colour.

### 4.1 Palette

| Token | Current | Proposed | Reason |
|---|---|---|---|
| `--background` (paper) | `#F6FAF0` | `#F8F5EC` | Warm bone. Stops the app reading as mint SaaS and makes green plants pop. |
| `--foreground` (ink) | `#0F2A1D` | `#0B2116` | Deeper, richer forest ink for display contrast. |
| `--primary` (forest) | `#375534` | `#2E4B2B` | More saturated, less olive; still 9.73:1 with white. |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | — |
| `--secondary` | `#E3EED4` | `#EFE7D2` | Warm cream bands; the brand's new "paper stock". |
| `--muted` | `#EDF3E3` | `#F1EDE0` | Warmer sunken surface. |
| `--muted-foreground` | `#4F6B55` | `#55614D` | Warm olive-gray; 6.01:1 on paper. |
| `--accent` | `#E3EED4` | `#EFE7D2` | Matches secondary. |
| `--border` | `#AEC3B0` | `#DAD4C3` | Decorative warm hairline only (1.36:1 by design). |
| `--input` | `#6B9071` | `#6E7D62` | Control borders, 4.04:1 on paper / 4.4:1 on white. |
| `--ring` | `#375534` | `#2E4B2B` | Focus ring, 8.93:1 on paper. |
| `--cta` (marigold) | `#F2A93B` | `#F0A63C` | Slightly deeper for warm paper; ink remains 8.22:1. |
| `--cta-hover` (new) | — | `#DE9426` | Hover state; ink 6.73:1. |
| `--offer` | `#C2562D` | `#B8502A` | Terracotta offer badge; white 4.98:1. |
| `--success` | `#2E7D32` | `#2F7D4F` | Slightly cooler green; white 5.04:1. |
| `--warning` / `--warning-foreground` | `#FDF3DC` / `#8A5A00` | `#FBF0D8` / `#7A5200` | Warmer; 6.12:1. |
| `--info` | `#1F6F8B` | `#1E6B86` | Deeper teal-blue; white 6.0:1. |
| `--sidebar` | `#0F2A1D` | `#0B2116` | Matches ink. |
| `--sidebar-foreground` | `#E3EED4` | `#EFE7D2` | Cream text on ink: 13.7:1. |
| `--sidebar-accent` | `#375534` | `#2E4B2B` | — |

New, non-palette tokens:

```css
/* Layout contract — replaces magic numbers for sticky offsets / flow bars */
--header-h: 4rem;              /* condensed one-row header, all breakpoints */
--flowbar-h: 4.5rem;           /* PDP / cart / checkout sticky action bar */
--bottomnav-h: 3.5rem;         /* floating pill nav footprint */

/* Depth — tinted with ink, never neutral gray */
--shadow-soft: 0 1px 2px rgb(11 33 22 / 0.04), 0 18px 42px -28px rgb(11 33 22 / 0.38);
--shadow-lift: 0 2px 4px rgb(11 33 22 / 0.05), 0 28px 60px -30px rgb(11 33 22 / 0.45);

/* Motion (CSS mirror of lib/motion.ts) */
--motion-fast: 150ms;
--motion-base: 250ms;
--motion-slow: 400ms;
--motion-hero: 700ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-inout: cubic-bezier(0.4, 0, 0.2, 1);
```

### 4.2 Proposed Appendix B block

```css
:root {
  color-scheme: light;
  --radius: 0.75rem;

  --background: #F8F5EC;            --foreground: #0B2116;
  --card: #FFFFFF;                  --card-foreground: #0B2116;
  --popover: #FFFFFF;               --popover-foreground: #0B2116;
  --primary: #2E4B2B;               --primary-foreground: #FFFFFF;
  --secondary: #EFE7D2;             --secondary-foreground: #0B2116;
  --muted: #F1EDE0;                 --muted-foreground: #55614D;
  --accent: #EFE7D2;                --accent-foreground: #0B2116;
  --destructive: #B3261E;           --destructive-foreground: #FFFFFF;
  --border: #DAD4C3;                /* decorative hairline only */
  --input: #6E7D62;                 /* control borders (>= 3:1) */
  --ring: #2E4B2B;

  --cta: #F0A63C;                   --cta-foreground: #0B2116;
  --offer: #B8502A;                 --offer-foreground: #FFFFFF;
  --success: #2F7D4F;               --success-foreground: #FFFFFF;
  --warning: #FBF0D8;               --warning-foreground: #7A5200;
  --info: #1E6B86;                  --info-foreground: #FFFFFF;

  --chart-1: #2E4B2B; --chart-2: #6F8F77; --chart-3: #F0A63C;
  --chart-4: #B8502A; --chart-5: #1E6B86;

  --sidebar: #0B2116;               --sidebar-foreground: #EFE7D2;
  --sidebar-primary: #F0A63C;       --sidebar-primary-foreground: #0B2116;
  --sidebar-accent: #2E4B2B;        --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #2E4B2B;        --sidebar-ring: #6F8F77;
}
```

The `.dark` block stays verbatim and unused (light-only decision). `@theme inline` keeps the same mapping; `--color-cta-hover` is added for the marigold hover state.

### 4.3 Contrast gate — run before approval

`applying-themes/scripts/check_contrast.py` is not present in this environment; an equivalent WCAG 2.x relative-luminance check was run against the proposed values.

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| ink on paper | 15.49 | 4.5 | pass |
| ink on white | 16.89 | 4.5 | pass |
| ink on cream | 13.70 | 4.5 | pass |
| forest on white | 9.73 | 4.5 | pass |
| forest on paper | 8.93 | 4.5 | pass |
| white on forest | 9.73 | 4.5 | pass |
| cream on ink | 13.70 | 4.5 | pass |
| muted-fg on paper | 6.01 | 4.5 | pass |
| muted-fg on white | 6.56 | 4.5 | pass |
| muted-fg on cream | 5.32 | 4.5 | pass |
| ink on marigold | 8.22 | 4.5 | pass |
| ink on marigold-hover | 6.73 | 4.5 | pass |
| white on offer | 4.98 | 4.5 | pass |
| white on success | 5.04 | 4.5 | pass |
| white on info | 6.00 | 4.5 | pass |
| warning-fg on warning-bg | 6.12 | 4.5 | pass |
| input border on paper | 4.04 | 3.0 | pass |
| input border on cream | 3.57 | 3.0 | pass |
| ring vs paper | 8.93 | 3.0 | pass |
| sage on paper (icon only) | 3.28 | 3.0 | pass |
| border on paper (decorative) | 1.36 | n/a | allowed only for dividers |
| mist on white (decorative) | 1.54 | n/a | allowed only for dividers |

**Note:** `--border` at 1.36:1 is no longer permitted on outline buttons, inputs, or any control whose boundary is the only affordance. Batch B/E replaces those with `border-input`. This is the Phase 1 P0-4 fix, not a new rule.

---

## 5. Surface, depth, and texture

- **Paper grain:** a **static background layer on the hero band only** — 2.5% opacity, `mix-blend-mode: multiply`, inline SVG `feTurbulence` (no file, no fixed full-page overlay). Disabled under `prefers-reduced-transparency` and never applied to dashboards, cards, forms, or product plates.
- **Header:** desktop glass only — `color-mix(in oklab, var(--background) 78%, transparent)` + `backdrop-blur-md` + hairline bottom border. **Mobile header is near-solid** (`color-mix(in oklab, var(--background) 96%, transparent)`, no `backdrop-blur`) to protect scroll performance on mid-range Android. No glass cards.
- **Shadows:** only two (`--shadow-soft`, `--shadow-lift`), always ink-tinted. Cards at rest get `--shadow-soft`; hover/focus-within gets `--shadow-lift`. No shadow on flat bands.
- **Framing:** product plates get a 1px `--border` hairline + `rounded-xl` inner image; no thick borders, no coloured outlines.
- **Product-photo system (the 3D-budget investment):** every catalogue image uses one `ProductPlate` treatment — fixed 4:5, warm off-white inner surface (`color-mix(in oklab, var(--secondary) 32%, white)`), 1px hairline, soft contact shadow, `object-cover`, blur-in placeholder via `PlantImage`, pointer-only `scale(1.03)` zoom, no tilt, no parallax. Consistent across card, rail, PDP gallery, related, cart, and order views.
- **Bands:** cream (`--secondary`) for discovery/trust; paper for rails; white for product surfaces. Never two cream bands adjacent.

---

## 6. Motion system

Add **`motion`** (Framer Motion) once, justified: it provides `MotionConfig`, lazy feature loading, reduced-motion handling, and spring feedback without hand-rolling transform state. Use `LazyMotion` + `domAnimation` + `m` (not `motion.*`) so the storefront pays ~20 KB gz, not ~50 KB.

`frontend/src/lib/motion.ts`:

```ts
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4, hero: 0.7 } as const;
export const EASE = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;
export const SPRING = { stiffness: 420, damping: 30, mass: 0.8 } as const;
```

Required patterns and rules:

| Pattern | Implementation | Guard |
|---|---|---|
| Scroll reveal | IntersectionObserver (once) + `m` transform/opacity; 24px rise, 40ms stagger | No reveal on dashboards; `MotionConfig reducedMotion="user"`; SSR content visible without JS |
| Hero parallax | `useScroll` + `useTransform`, max 24px / 0.04 scale | Only ≥ md, pointer fine, no reduced motion; transform/opacity only |
| Press/hover | `active:scale-[0.98]` (already global), card lift, `SPRING` on cart bump | No layout-affecting transforms |
| Card → PDP | `document.startViewTransition` with a `<ViewTransition>` fallback if React exposes it; `view-transition-name` only on the pressed card image + PDP main image | Feature-detect; plain navigation fallback; disabled under reduced motion |
| Add to cart | Cart icon bump + toast **first**. WAAPI fly-to-cart clone is optional and only after batch G if time remains | Reduced motion → bump/fade only; no fly |
| Count-up | Seller/admin KPI counters only, `tabular-nums` | Reduced motion → final value immediately |
| Skeleton | CSS shimmer (gradient sweep) | Static tint under reduced motion |
| Trust strip | **Static row**, no marquee, no animation | — |
| Hero leaf drift | One CSS transform loop on 1–2 inline-SVG leaves, desktop only, 6–10 px over 6–8 s | `animation: none` under reduced motion and < md; **the only ambient loop in the product** |
| Carousel (campaign banners) | Embla + autoplay 5s | Visible pause control, pause on hover **and focus**, no autoplay under reduced motion (WCAG 2.2.2) |

Hard rules:

- Animate `transform` and `opacity` only. Never animate `height`, `top`, `width`, or grid tracks on long lists.
- Never split Bangla text by character. Reveal whole headings or words; prefer whole blocks.
- Motion lives in client islands; server HTML and SEO output stay complete.
- **Exactly one ambient loop: the desktop hero leaf drift.** No marquee, no looping gradients, no looping skeleton after load.
- One ambient element per viewport maximum.

---

## 7. Hero (home)

### 7.1 Composition (server-rendered, LCP)

**Desktop (≥ md):** full-bleed cream→forest band, grain, `max-w-7xl` inside.

```
┌──────────────────────────────────────────────────────────────┐
│  [eyebrow: যাচাইকৃত নার্সারি · সারা দেশে ডেলিভারি]           │
│                                                              │
│  ঘর ভরে তুলুন            ┌───────────┐   ✦ floating leaf     │
│  সবুজে.                  │ cutout 01 │  ┌─────────┐           │
│  (Fraunces bn/en)        │  (mid)    │  │ product │  ← mid    │
│  One-line promise.       └───────────┘  │  plate  │    layer  │
│                                          └─────────┘          │
│  [ 🔍 Search plants…            ] [Browse all →]             │
│  COD · 48h complaint window · verified sellers               │
└──────────────────────────────────────────────────────────────┘
```

- **One `<h1>`**, Bangla default, English alternate; display size `clamp(2.5rem, 6vw, 5rem)`, line-height 1.06 Latin / 1.55 Bangla.
- Search is a **server-rendered `<form action="/products" method="get">`** with `name="q"` — works without JS, zero bundle cost. The marigold submit button is the only CTA; "Browse all plants" is an outline link.
- Trust micro-row is plain text, no invented metrics.
- **LCP is the server-rendered hero composition.** It paints fully without JS: the composition's largest element (the hero image/cutout with `priority` + `fetchPriority="high"`, explicit aspect ratio, `sizes`) is the LCP candidate; if the interim composition is type + SVG only, the `<h1>` block is the LCP element. Motion is a client enhancement applied after hydration and never gates the first paint.

**Mobile (< md):** one column; cutouts collapse to a single back plane behind the copy; headline + search stay above a bottom scrim. No parallax and no floating leaves on mobile. Header is one row, so the hero starts immediately under it.

### 7.2 Depth planes (2.5D, no 3D)

1. **Back:** cream→forest wash + grain + one large inline-SVG leaf silhouette (code, not an asset) + a soft radial contact shadow.
2. **Mid:** 2–3 transparent plant cutouts from `public/hero/` at ±2° rotation with `--shadow-soft` contact shadows. Until the owner supplies cutouts, the mid plane uses real product plates (existing 4:5 images) — honest, no fake transparency.
3. **Front:** 1–2 inline-SVG floating leaves + one marigold tag ("COLLECTION 01" / localized); a 6–10px drift over 6–8 s via CSS transforms, `animation-play-state: paused` under `prefers-reduced-motion`.
4. **Scroll-linked parallax:** translate 8 / 16 / 24 px and scale 1.00→1.02 across the three planes, `transform` + `opacity` only. Disabled below `md` and under reduced motion; applied via CSS custom properties updated in a rAF-throttled listener (no React state per frame).
5. **Interim:** if `public/hero/` is empty, the composition still ships (existing banner backdrop + product plates + SVG leaves), and cutouts replace the mid-plane elements 1:1 when they land.

### 7.3 3D — out of scope

Owner decision, 2026-11-13. **Do not add** `three`, `@react-three/fiber`, `@react-three/drei`, any GLB/GLTF asset, any lazy 3D chunk, or any 3D capability-detection logic. Depth is achieved with the layered 2.5D composition above. The former 3D budget is reallocated to: product-photo treatment (§9), typography hierarchy (§3), section rhythm (§8), and micro-interactions (§6).

### 7.4 Asset slots (owner-supplied)

| File | Spec | Interim |
|---|---|---|
| `public/hero/cutout-plant-01.webp` … `-04.webp` | transparent background, longest edge ≤ 800 px, ≤ 80 KB each, 2–3 plants with clean edges | existing banner backdrop + framed product plates + inline SVG leaves |

**No poster file and no GLB are required.** The composition is server-rendered from code, existing imagery, and these cutouts. Cutouts replace the interim mid-plane elements 1:1 without layout changes. Cutouts are decorative (`alt=""`); the `<h1>` carries the meaning. The owner should keep transparent margins tight so contact shadows sit on the plant, not on empty canvas.

---

## 8. Home rhythm (replaces §6.7 order)

> **Consistency amendment (2026-11-17):** every section below is rendered through
> `HomeSection` (`mx-auto max-w-7xl px-4`, top rhythm **32 / 48 / 64 px** at
> mobile / md / lg) + `SectionHeader` (24/32/600 mobile, 30/36/600 md, one
> trailing 44 px "View all" action with the same arrow). Sections are laid out
> edge-to-edge; the section's own top padding is the gap. The hero, every home
> section, the header and the footer share the same 16 px inline edge.

1. **Hero** (branded, layered).
2. **Trust strip** — one static cream card containing the four trust promises and the three how-it-works steps; no separate how-it-works band, no marquee, no invented stats.
3. **Category discovery** — **all active top-level categories** (currently 11, capped at 12) as uniform compact tiles, not an asymmetric bento. Desktop: six fixed-width tiles per row in `flex-wrap justify-center`, so 3/7/11/12 categories never leave a left-aligned orphan; a trailing dashed **All categories** tile balances the common 11-tile case. Tablet/mobile: the shared snap rail with 44 px arrow buttons at md and no arrows on touch. Each tile shows a real admin image when one exists; otherwise a calm slug-stable category icon on a token-tinted surface, with the real in-stock count. `?category=<slug>` search behaviour is unchanged. Rationale: the seeded images are byte-identical placeholders, and the 2+4 bento hid 5 of 11 categories and grew to 745 px.
4. **Rails** (server-rendered, CSS snap, no JS):
   - **First paint (3):** Trending → `sort=popular&inStock=true` · New arrivals → `sort=newest&inStock=true` · Under ৳500 → `maxPrice=500&sort=popular&inStock=true`
   - **Lazy below the fold (2):** Low-light plants → `light=LOW_LIGHT&inStock=true` · Pet-safe → `isPetSafe=true&inStock=true`
   - Curate every rail through `home-rail-products.ts`: **plants only** (exclude seeds, pots, soil and tools) and in stock. Fetch up to 50 candidates per first-paint rail, then exclude ids already shown by the previous rail and take 8. This keeps Trending / New arrivals / Under ৳500 genuinely distinct and prevents the empty New-arrivals rail caused by the identical `popular`/`newest` seed ordering. Lazy rails exclude all earlier rail ids too; with the current small catalogue Low light correctly shows its 3 remaining unique plants and Pet safe 5.
   - Each rail: "View all" to the exact filtered `/products` URL (same size/position), a header-height skeleton while loading, an inline retry for a failed lazy rail, and no blank gap. The two lazy rails mount only when their sentinel approaches the viewport (`IntersectionObserver`, `rootMargin: 600px`), with skeletons that reserve the final rail height (no CLS).
5. **Campaign band** — the three hardcoded banners become one promotional band labelled **Highlights** (not "this week's offers"), with a pause control and no second autoplay carousel above the fold.
6. **All products** — seeded random infinite feed labelled All products ("Plants, pots and care essentials"), in stock, with initial-page skeletons, inline initial/next-page error + retry, empty state and end state. The feed intentionally includes the catalogue's accessories; rail curation stays plants-only.
7. **Footer** — shared footer, 44 px link targets; the feed's bottom padding and the footer's top margin form the page end.

All rail filters exist in `features/catalog/query.ts`; no invented fields. Each rail is a cached server function (`Promise.all`, tag `products`) so the hero and categories are not blocked. `rail-scroller.tsx` is the only product/category arrow rail; `product-card.tsx` is the only card.

---

## 9. Product card

> **Owner decision (2026-11-14):** remove per-card quick-add entirely. Plants are a considered purchase; the card is a single PDP link. The wishlist heart remains the only card action. Do not add add-to-cart controls to cards (a later A/B may test direct Add for consumables only).

One component, three variants via props: `variant="compact" | "featured" | "skeleton"`.

```
compact (mobile 2-up, ~160–174px)
┌──────────────────┐
│ 4:5 image plate  │  ← 1px hairline, rounded-xl
│ ♡ (44 hit)       │
│ [badge]          │
├──────────────────┤
│ Monstera deliciosa  │  ← 2 lines max, 13–14px
│ ৳ 850   ৳ 1,050̶    │  ← 15–16px semibold
│ ★ 4.8 · 12          │  ← only if count > 0
└──────────────────┘
```

- Mobile: 2 columns, 10–12px gap, px-4. Desktop: 5 (lg) / 6 (xl).
- `featured`: same anatomy, 2×2 span in the bento, larger type,
- `skeleton`: same dimensions; shimmer via CSS.
- Hover (pointer only): card lifts 2px, image scale(1.03); no add control on the card.
- One focus target per card: the whole card links to the PDP; the wishlist heart is a separate 44px button that never navigates.
- Rating renders only when `ratingCount > 0` (kills the "0 reviews" noise).
- Radius: compact `1rem`, featured `1.35rem`, controls pill. No other values.

**Data honesty gaps (do not fake):** the list DTO has one image, no `compareAt`, no `shop.verified`, no stock quantity, no `shop.rating`. So `offer`/`low-stock`/`verified`/compare-at/photo-crossfade render **only if the field exists**; the rest go to `backend/docs/BACKEND_CHANGE_REQUESTS.md`. The layout reserves their slots now.

---

## 10. Shell

- **One-row mobile header** at all widths: logo, search trigger, bell, cart, account. The dedicated second-row mobile search is removed; tapping the icon opens the existing full-screen dialog. Height token `--header-h` = 64px; no 120px header. **Exception: `/products` keeps a visible inline search field on mobile** (below the one-row header, inside the results header), because search is the page's primary tool; the home hero provides its own search field, and every other route uses the header icon.
- Header condenses on scroll: height 72→64px on desktop, background opacity 0.78→0.92; transform/opacity only. **Mobile header stays near-solid** (96% background, no blur) at rest and while scrolling.
- **Floating pill bottom nav** (mobile): inset 12px, `rounded-full`, glass, safe-area aware. Hidden on `/checkout` and whenever a page flow bar is mounted (context flag), so no double bottom bars.
- Locale switch inside the mobile account dropdown (and desktop header). Account menu gets a "Language / ভাষা" section.
- Skip link, focus-visible ring, 44px targets everywhere.
- Dashboards keep the dark-ink sidebar but adopt the new ink/cream/forest values and Fraunces page titles; **no hero motion**.

---

## 11. Batches

| Batch | Content | Gate |
|---|---|---|
| A | Phase 1 P0: cart 360px line, error≠empty (cart/orders/checkout/dashboard), orders + wishlist pagination, a11y blockers (names, targets, contrast, carousel pause) | ships regardless; lint/typecheck/test/build |
| B | Tokens (globals.css + Appendix B + MASTER.md), Fraunces + Tiro Bangla assets, `lib/motion.ts`, `MotionConfig`, `EmptyState`, `FixedBar`, layout-height contract | contrast gate + **screenshots to `.artifacts/b/`** (360×800, 1280×800, bn+en) |
| C | Header, condensed glass, bottom nav, locale in account menu, `/products` mobile search field | 360/768/1280 bn+en |
| D | Hero (server-rendered composition + 2.5D cutout planes), static trust strip, bento categories, 3+2 rails, campaign band; `public/hero/` + doc slots | LCP/CLS + axe + **screenshots to `.artifacts/d/`** (360×800, 1280×800, bn+en) |
| E | Product card variants (single PDP link), catalog CTA fix, shadcn sort Select, retry states, backend requests | card grid 2/4/5, e2e guest cart |
| F | PDP, cart, checkout (Phase 1 P1-1..5), RHF+zod address form, flow-bar contract | checkout e2e, 360 overflow |
| G | Seller/admin tokens/type, grouped nav, page header, actionable dashboard, count-up | dashboards 360/1280, axe |

Each batch: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, Playwright screenshots (360/768/1280, bn+en), axe on the touched pages, console/network clean.

---

## 12. Performance budget

| Metric | Budget | How |
|---|---|---|
| Home added JS (gzip) | ≤ 60 KB | `LazyMotion` + `m` (~20 KB), hero/rails/reveal islands ~8 KB, view-transition wrapper < 1 KB. No 3D chunk exists. |
| LCP (mobile 4G, `/`) | ≤ 2.5 s | hero composition is server-rendered; priority image/cutout with `sizes`, reserved aspect, no client-gated hero |
| CLS | < 0.1 | fixed aspect ratios, font metric overrides, skeleton rails with reserved height |
| INP | < 200 ms | transform/opacity only, no per-frame React state, rail/card grids server-rendered |
| PDP LCP | ≤ 2.5 s | main gallery image priority; live price island unchanged |
| Added server calls on home | 3 rail queries on first paint + 2 lazy + categories/feed | cached (`use cache`, tag `products`), parallel, streamed in Suspense; lazy rails mount at 600px |

If a pattern breaks the budget, the pattern is cut and reported. The saved 3D budget is spent on the product-photo system (consistent 4:5, soft warm backdrop, pointer-only zoom), type hierarchy, band rhythm, and micro-interactions — not on new dependencies.

### 12.1 Where the 3D budget went

| Investment | Concrete change | Cost | Batch |
|---|---|---|---|
| Product-photo treatment | One `ProductPlate` wrapper: fixed 4:5, warm off-white inner backdrop, 1px hairline, soft contact shadow, `object-cover`, blur-in placeholder, pointer-only `scale(1.03)` zoom, no tilt/parallax | 0 JS (CSS) | B/E |
| Typography hierarchy | Fraunces + Tiro Bangla display steps + Inter UI + Hind Siliguri Bangla body (size/space, never fake bold); tabular numerals for prices | 153 KB fonts, once | B |
| Section rhythm | `HomeSection` + `SectionHeader`; 32/48/64 px top rhythm; uniform category tiles with centered wrapping rows; one focal point per band | 0 JS | D |
| Micro-interactions | Cart icon bump + toast, wishlist heart pop, skeleton shimmer, card hover lift; **fly-to-cart only if time remains after batch G** | ~4 KB | B/E/F |
| Campaign motion | One pause-controlled campaign band; static trust strip (no marquee) | < 1 KB | D |

No 3D dependency, loader, asset, or detection code is added; the saved bytes are converted into rendered quality, not runtime weight.

---

## 13. Accessibility acceptance (per batch)

- Text 4.5:1; UI boundaries 3:1 (`border-input` on controls); focus indicator 3:1 and ≥ 2px.
- 44×44 targets (visual size may be smaller with expanded hit area).
- Accessible names: "Decrease quantity"/"Increase quantity", "Add to cart", "Add to wishlist", "Pause promotions".
- Variant chips become a proper radiogroup (arrow keys, one tab stop).
- Carousel/banners: pause control + pause on focus.
- Reduced motion: no parallax, no fly-to-cart, no marquee, no count-up animation.
- One `<h1>` per page; landmarks; heading order; breadcrumbs on PDP.
- Bangla: line-height ≥ 1.6, no tight leading, no character-splitting animation, digits via `Intl`.

---

## 14. Backend change requests (to file in batch E)

1. **Catalog list enrichment:** expose `images[1]` (for hover crossfade), `minCompareAtPrice` (offer badge/strike price), `shop.verified`, `shop.ratingAvg`, a low-stock hint (`stockQty` or `lowStock: boolean`). Without these, the card renders only what is provable and carries no add-to-cart control.
2. **Seller product list pagination/filter:** `GET /seller/products` accepts no `page`/`limit`/`status`; the client currently filters the full set. Add query params + meta.
3. Optional: wishlist/notifications `page` meta already exists — confirm limits before wiring pagination in batch A.

No backend code is modified; these are recorded in `backend/docs/BACKEND_CHANGE_REQUESTS.md`.

---

## 15. What the owner must supply

- Transparent-background plant cutouts for `public/hero/` only — 2–3 files, specs in §7.4. **No poster and no GLB are needed.**
- A working `Kalpurush.ttf` with Bengali glyphs (current file lacks them) if Kalpurush should render instead of Hind Siliguri.
- Final campaign banner artwork (same hardcoded names; existing files are 218–452 KB and will be optimized by `next/image`, but source replacement is preferred).

---

## 16. Risks and deferrals

| Risk | Mitigation |
|---|---|
| 5 rail queries increase backend load | cached, 8 items each, parallel, tag-invalidated; measure cold/warm; drop a rail if TTFB regresses |
| Font swap shifts hero headline | `size-adjust`/metric overrides + preload; verify CLS in Lighthouse |
| Motion adds INP on low-end Android | LazyMotion, transform/opacity, no state per frame, reduced-motion path tested on CPU-throttled Playwright |
| View Transitions inconsistency | feature-detect + plain navigation fallback; never block navigation |
| Card enrichment absent → "plain" cards | slots reserved; layout must look intentional with image/name/price/rating only |
| Header condense affects sticky offsets | single `--header-h` contract; product section nav and sidebars consume it |
| Bottom nav hidden on checkout | context flag + safe-area padding; verify no double flow bar |

**Out of scope by owner decision:** 3D entirely (no `three`/fiber/drei, no GLB, no capability detection). **Deferred with reason:** second-image crossfade (no list field), offer/low-stock/verified card badges (no list fields), campaign banner source optimization (owner artwork), dark mode (owner decision).

---

## 17. Approval checklist

- [x] Direction name and rationale accepted.
- [x] **No 3D:** hero is a server-rendered composition with 2–3 cutout depth planes; no `three`/fiber/drei/GLB added.
- [x] Display pairing accepted with the approved change: **Tiro Bangla 400 for h1/h2**, Fraunces for Latin display, Hind Siliguri for body/UI (2 files, 153 KB OFL).
- [x] Palette evolution accepted (values in §4.1) and contrast table accepted.
- [x] Home order accepted (hero → static trust → how-it-works → bento → 3 rails + 2 lazy → campaign → feed).
- [x] Card variants and data-honesty constraints accepted; no add-to-cart control on cards; the PDP sells.
- [x] Motion scope accepted: static trust strip; desktop hero leaf drift is the only ambient loop; fly-to-cart optional after batch G.
- [x] Batches A–G accepted; screenshots after B and D were temporary and are not committed.

**Approved 2026-11-13.** Implementation starts with batch A, then B onward without further approval gates. The only remaining gate is the owner-supplied hero cutouts (interim composition ships without them).
