# Design System — Eulerity Metrics

North star: **rigor made visible.** A judge should walk away remembering
"they caught things nobody else caught — and the UI shows it." Every tiebreak
in this document resolves toward making the forensic layer (window labels,
neutral spend chips, weekend captions, overlay captions) read as calm authority.

## Product Context
- **What this is:** Multi-channel marketing analytics dashboard (Facebook, Instagram, Google, LinkedIn) for the Eulerity 2026 web challenge.
- **Who it's for:** Eulerity judges evaluating engineering + design judgment; notionally, marketers reading ad performance.
- **Space/industry:** SaaS analytics dashboards (peers: Linear, Stripe, Mercury dashboards; refs: Cyclops, Nexus, Flup on Dribbble).
- **Project type:** Data-dense web app / dashboard. Light theme only (deliberate cut — see Decisions Log).

## Aesthetic Direction
- **Direction:** Light modern-SaaS analytics — "calm credibility with rigor on display."
- **Decoration level:** Intentional — soft two-layer shadows, gradient strictly as accent. No texture, no illustration, no decorative blobs.
- **Mood:** Quiet, precise, trustworthy. The canvas stays neutral so the annotation layer is the only thing that "speaks."
- **Reference anchors:** Cyclops, Nexus, Flup (Dribbble, captured 2026-07-10).

## Typography
- **All roles:** Manrope (geometric sans) — single-family system is deliberate for a dashboard; hierarchy comes from size/weight, not family changes.
- **Data/numerals:** Manrope with `font-variant-numeric: tabular-nums` via the global `.tnum` class — **every numeric readout** (KPIs, tables, tooltips, deltas) must carry it so digit columns align.
- **Loading:** Google Fonts, weights 400/500/600/700/800, `display=swap` (wired in `index.html` with preconnect).
- **Scale (tokens in `theme.type`):**
  - caption 12px / 400–500 — annotation layer (window labels, chart captions)
  - label 13px / 600 — form labels, table headers, nav items
  - body 15px / 400 — default (set on `body`)
  - section 18px / 700 — card and section headings
  - title 24px / 800 — page titles
  - kpi 32px / 800 — hero KPI numbers (always `.tnum`)
- **Line height:** 1.5 body, 1.2 headings (global).

## Color
- **Approach:** Restrained. Data hues outrank brand hues; the brand gradient never competes with platform colors on a chart.
- **Ink:** `#161B2C` (primary text) · `#5A6474` inkMuted (5.98:1 on white, verified) — muted is the voice of the annotation layer.
- **Surfaces:** `#F6F7FB` page canvas · `#FFFFFF` cards · `#E4E7EF` borders · `#EBEDF4` fill (tracks, hovers, weekend bands).
- **Accent:** blue→violet gradient `#3B6CF6 → #8B5CF6`, 135deg. **Scoping law (hard rule):** buttons, active nav, chart area fills only. Never page backgrounds, never text, never large surfaces. This is the one flourish; discipline is what keeps it from reading as AI-slop.
- **Platform hues (dual-token, machine-verified):** each platform has `base` (chart marks, ≥3:1 vs white) and `text` (body-size text, ≥4.5:1 vs white):
  - Facebook `#1877F2` / `#0B5CC4` · Instagram `#D6317E` / `#AD1663` · Google `#C77E00` / `#8A5800` · LinkedIn `#0A66C2` / `#0A66C2`
- **Semantic (delta system, three-valued):**
  - favorable `#116B45` on `#E3F4EB`
  - unfavorable `#B42318` on `#FDEBE9`
  - **neutral (spend)** `#454C5E` on `#EBEDF4` — spend has no intrinsic direction (PLAN ambiguity #1); the designed-neutral chip is a product decision, not a missing style.
- **Dark mode:** none, deliberately. Light-only identity; every polish hour concentrates on one theme. Documented in README's not-built list.

## Spacing
- **Base unit:** 4px via `theme.space(n)`.
- **Density:** Comfortable — data-dense but breathing.
- **Working values:** card padding `space(5–6)` (20–24px) · KPI grid gap `space(4)` (16px) · section gap `space(8)` (32px) · inline chip/label gaps `space(2)` (8px).

## Layout
- **Approach:** Grid-disciplined. Fixed left sidebar (Dashboard / Meta / Google / LinkedIn), content area with KPI tile row → hero chart → detail sections.
- **Sidebar:** 232px (`theme.layout.sidebarWidth`), collapses under the `sm` (640px) breakpoint.
- **Max content width:** 1280px (`theme.layout.contentMax`), centered.
- **Border radius (hierarchical):** sm 8px (inputs, chips) · md 12px (cards) · lg 16px (hero cards, modals) · pill 999px (badges, toggles). Radius signals hierarchy — don't flatten it to one value.
- **Shadows:** `soft` for resting cards, `raised` for hover/popover. Two layers each; never single hard drop shadows.

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension (hover states, panel/route fades, chart entrance).
- **Durations (tokens in `theme.motion`):** micro 120ms (hovers, focus) · short 180ms (chips, toggles) · medium 240ms (panels, route-level fades). Nothing longer.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Reduced motion:** global `prefers-reduced-motion` kill switch in `GlobalStyle` zeroes all animation/transition durations. Any new animation must survive being turned off.

## Data-Viz Ruleset (serves the north star)
- **Line series:** 2px stroke, platform `base` hue; dots only on hover/focus.
- **Area fills:** brand gradient or platform hue at ≤12% opacity — fills support, never dominate.
- **Ghost overlay (previous period):** dashed 1.5px, inkMuted — visually subordinate to the current period; always accompanied by its caption; renders only when `windowDays % 7 === 0` (weekday-phase gate), otherwise the caption explains why it's off.
- **Weekend bands:** `fill` token (`#EBEDF4`) background bands + one-line "expected pattern" caption on LinkedIn (~7% weekday volume is intentional data).
- **Undefined deltas:** render `—`, never NaN/Infinity/0%; zero-denominator and previous=0 cases are first-class states.
- **Window labels:** every data view carries a caption-style chip stating its exact window (e.g. "Jun 27 – Jul 10 · 14 days") — dashboard (fixed 30d) and detail pages (7–30d) will disagree numerically by API design, and the labels are how the UI owns that instead of hiding it.
- **Tooltips:** white card, `soft` shadow, `sm` radius, label 13px + `.tnum` values; dual-value rows when the ghost overlay is active.
- **Focus:** `:focus-visible` 2px `accentFrom` outline, 2px offset (global) — applies to chart controls and export buttons too.

## Annotation Layer (first-class pattern)
The differentiator. Window-label chips, weekend captions, overlay-disabled captions,
and the neutral spend chip share one voice: caption size (12px), inkMuted, consistent
placement (top-right of the card or directly under the chart title). Quiet, consistent,
everywhere. If an annotation needs to shout, it's wrong — authority comes from
uniformity, not emphasis.

## Anti-patterns (hard rules)
- Gradient outside its scoping law (backgrounds, text, large surfaces)
- Rate metrics summed or averaged for display (recompute from summed bases — mirrors the API contract)
- NaN/Infinity/naked 0% in any delta position
- Non-tabular numerals in any aligned numeric context
- Single-value radius or single-layer shadows
- New animation without a reduced-motion story

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-10 | Initial direction: light SaaS analytics, Manrope, blue→violet accent, platform dual-tokens | User-selected from Dribbble refs (Cyclops/Nexus/Flup); contrast machine-verified (contrast.mjs) |
| 2026-07-10 | North star: "rigor made visible" | Challenge page: judgment beats feature count; forensic UI layer is the differentiator |
| 2026-07-10 | Codified into DESIGN.md via /design-consultation (codify + harden scope) | System already load-bearing mid-build; value is completeness, not a new direction |
| 2026-07-10 | Gradient scoping law made a hard rule | Purple gradients are the #1 AI-slop pattern; discipline of scope is the defense |
| 2026-07-10 | No dark mode | Light-only identity; concentrate polish on one theme; listed in README not-built |
| 2026-07-10 | Hardening tokens added: type ramp, motion durations/easing, layout constants | Gaps found during codification — values existed only as per-component improvisation |
