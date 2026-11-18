# Design System Master File — PlantHaat

> **LOGIC:** When building a specific page, first check `pages/[page-name].md` (this folder).
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **Direction:** “Living Herbarium” — Botanical Organic × Warm Editorial.
> Full rationale, hero/card/shell specs and batch plan: `DIRECTION.md` (this folder).
> Palette/type here are reconciled to `../FRONTEND_DESIGN.md` Appendix B (2026-11-13); the
> generator's original mint/Rubik defaults are intentionally superseded.

---

**Project:** PlantHaat
**Category:** Multi-vendor plant marketplace (Bangladesh)
**Theme:** Light only. No dark mode. No 3D.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary (forest) | `#2E4B2B` | `--primary` |
| On Primary | `#FFFFFF` | `--primary-foreground` |
| Secondary (cream) | `#EFE7D2` | `--secondary` |
| On Secondary (ink) | `#0B2116` | `--secondary-foreground` |
| CTA (marigold) | `#F0A63C` | `--cta` |
| On CTA (ink) | `#0B2116` | `--cta-foreground` |
| CTA hover | `#DE9426` | `--cta-hover` |
| Background (bone) | `#F8F5EC` | `--background` |
| Foreground (ink) | `#0B2116` | `--foreground` |
| Card | `#FFFFFF` | `--card` |
| Muted | `#F1EDE0` | `--muted` |
| Muted foreground | `#55614D` | `--muted-foreground` |
| Border (decorative hairline) | `#DAD4C3` | `--border` |
| Input border (controls) | `#6E7D62` | `--input` |
| Offer / terracotta | `#B8502A` | `--offer` |
| Success | `#2F7D4F` | `--success` |
| Warning | `#FBF0D8` / `#7A5200` | `--warning` / `--warning-foreground` |
| Info | `#1E6B86` | `--info` |
| Sidebar (ink) | `#0B2116` | `--sidebar` |
| Ring (focus) | `#2E4B2B` | `--ring` |

**Contrast rules:** text ≥ 4.5:1; UI boundaries ≥ 3:1. Use `--input` for control borders; `--border` is decorative and may not be the sole affordance. All pairs verified in `DIRECTION.md` §4.3.

### Typography
- **Latin (all roles):** Inter (self-hosted variable), `tabular-nums` for prices, order numbers and counters.
- **Bangla (all roles):** Hind Siliguri 400/600 (self-hosted); Kalpurush is fallback only (the supplied file has no Bengali glyphs/layout tables).
- Heading stack: `Inter, "Hind Siliguri", "Hind Siliguri Fallback", "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif`; Latin first so digits/taka stay Latin and Bangla glyphs fall through.
- `font-synthesis: none`; no italics; hierarchy is weight + size (headings 600/700), never a second family.
- Bangla line-height 1.55 (h1/h2) / 1.6-1.7 (body); never negative tracking; never split Bangla by character for motion.
- Mood: botanical editorial, specimen-sheet, warm print - not SaaS, not a vibrant startup.
### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `8px` | Icon gaps, inline spacing |
| `--space-md` | `16px` | Standard padding |
| `--space-lg` | `24px` | Section padding |
| `--space-xl` | `32px` | Large gaps |
| `--space-2xl` | `48px` | Section margins |
| `--space-3xl` | `64px` | Hero padding |

Rhythm: alternate paper / cream / white bands; `py-12 md:py-20` for marketing sections; 8-pt base.

### Depth

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-soft` | `0 1px 2px rgb(11 33 22 / .04), 0 18px 42px -28px rgb(11 33 22 / .38)` | Cards at rest, product plates |
| `--shadow-lift` | `0 2px 4px rgb(11 33 22 / .05), 0 28px 60px -30px rgb(11 33 22 / .45)` | Hover/focus-within |

No third shadow. No neutral-gray shadows. No glow.

### Motion

| Token | Value |
|-------|-------|
| `--motion-fast` | 150 ms |
| `--motion-base` | 250 ms |
| `--motion-slow` | 400 ms |
| `--motion-hero` | 700 ms |
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` |
| `--ease-inout` | `cubic-bezier(.4, 0, .2, 1)` |
| Spring | stiffness 420 / damping 30 / mass .8 (cart + press only) |

One ambient loop only: desktop hero leaf drift (CSS transform, stops under reduced motion). Trust strip is static. `MotionConfig reducedMotion="user"`.

---

## Component Specs

### Buttons

```css
/* Primary (forest) */
background: var(--primary); color: var(--primary-foreground);
border-radius: 9999px; min-height: 44px; padding: 0 24px;
transition: background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out);

/* CTA (marigold, one per region) */
background: var(--cta); color: var(--cta-foreground);
/* hover: var(--cta-hover); active: translateY(1px); focus-visible: 3px ring */
```

### Cards

```css
/* compact product card */
background: var(--card); border: 1px solid var(--border); border-radius: 1rem;
box-shadow: var(--shadow-soft);
/* featured/bento card: border-radius: 1.35rem */
/* hover (pointer only): translateY(-2px); image scale(1.03); shadow -> var(--shadow-lift) */
```

### Home sections

- `HomeSection`: `mx-auto max-w-7xl px-4`, `pt-8 md:pt-12 lg:pt-16` (32/48/64 px); sections are adjacent and their top padding is the gap. Header/hero/footer share the 16 px inline edge.
- `SectionHeader`: `h2` 24/32/600 mobile, 30/36/600 md; one trailing View all link, 44 px target, 14 px/500, same arrow position. No per-section one-off heading CSS.
- Category tiles: uniform compact cards, 96 px rounded-2xl image/icon frame (80 px mobile), 14 px name, 12 px real in-stock count; desktop six per centered wrapping row + optional dashed All categories tile; tablet/mobile shared snap rail with 44 px arrows at md; slug-stable icon/tint fallback when no real image (dev placeholder detection only).
- Product rails: one `ProductCard` + one `ProductRail` + one `RailScroller`; 8 curated plants in stock, disjoint across rails, 44 px arrows at md+, reserved-height skeletons, localized region/arrow names.

### Inputs

44px height minimum, `border-input`, visible focus ring, label above, error text next to the field, `aria-describedby` for hints/errors. No placeholder-as-label.

### Flow bar

Fixed above the floating bottom nav, uses `--flowbar-h`; the page container reserves `calc(var(--flowbar-h) + var(--bottomnav-h) + 1rem)`; hidden when no action is available. No double bottom bars.

### Hero

Server-rendered composition = LCP. Static grain on the hero band only. 2–3 transparent cutout planes + scroll-linked transform/opacity parallax. No 3D, no GLB, no capability detection.

---

## Anti-Patterns (Do NOT Use)

- ❌ Flat design without depth
- ❌ Text-heavy pages
- ❌ **3D / WebGL / GLB** — out of scope by owner decision
- ❌ Purple/pink “AI” gradients, glow blobs, animated gradient meshes
- ❌ Emojis as icons (use Lucide, one stroke weight)
- ❌ Decorative marquee / infinite loops other than the hero leaf drift
- ❌ Full-page fixed grain or blur overlays
- ❌ `backdrop-blur` on the mobile header (near-solid only)
- ❌ Tight leading or negative tracking on Bangla
- ❌ Character-split Bangla text animation
- ❌ Low-contrast text (< 4.5:1) or `--border` as the only control boundary
- ❌ Invisible focus states
- ❌ Layout-shifting hovers
- ❌ More than one marigold CTA per screen region
- ❌ More than two shadows or more than one card radius tier (1rem compact / 1.35rem featured)

---

## Pre-Delivery Checklist

- [ ] No emojis as icons; one icon set (Lucide)
- [ ] All clickable elements are real `<a>`/`<button>` with visible focus
- [ ] Hover/press transitions 150–300 ms; motion honours `prefers-reduced-motion`
- [ ] Text 4.5:1; control boundaries 3:1 (`border-input`)
- [ ] 44×44 targets; expanded hit areas where visuals are smaller
- [ ] Bangla line-height ≥ 1.55; no fake bold; no character splitting
- [ ] One marigold CTA per region; one ambient loop only
- [ ] Static trust strip; no marquee
- [ ] Mobile header near-solid; desktop glass only
- [ ] No content hidden behind flow bars / bottom nav
- [ ] No horizontal scroll at 360 px
- [ ] Verified at 360×800, 768×1024, 1280×800 in `bn` + `en`
- [ ] No 3D dependency, asset, or loader added
