# Build Plan — Eulerity Web Challenge 2026

Synthesized from a 3-lens planning panel (data-architecture / UX-design / risk-judgment), each adversarially critiqued; revised 2026-07-10 by /office-hours (user decisions D1–D9). See SPEC.md for the verified API surface and the design doc at `~/.gstack/projects/alin9661-eulerity/aaronlin-main-design-20260710-111013.md`.

## Rule zero — requirement precedence (user directive)

**The challenge HTML (web-2026.html → SPEC.md) is the top authority.** Its 6 mandatory requirements and required stack override every design preference and bonus. Cut order when time pressure hits: ghost overlay first, then secondary charts, then polish extras — never core requirements, tests, README artifacts, or deploy.

## Product concept

**"Eulerity Metrics"** — a light-theme modern SaaS analytics product (user-selected direction, anchored to three Dribbble references: Cyclops, Nexus, Flup): white cards (radius 12–16px, soft shadows) on a soft neutral background (#F6F7FB-ish), **left sidebar navigation** (Dashboard, Meta, Google, LinkedIn), KPI tile row with delta chips, hero time-series chart with blue→violet gradient fills, Manrope-class geometric sans + tabular numerals on all stats. The blue→violet gradient is strictly an accent system (buttons, chart fills, active nav) — never a page background. Platform data-hues (FB blue, IG magenta, Google amber, LinkedIn sky) kept distinct from the brand accent; contrast targets split: ≥3:1 vs white for chart marks, ≥4.5:1 for hues used as text (darker text-variant token per platform).

## Verified data constraints that drive the architecture

1. **Data is deterministic per URL** (user-corrected, re-verified 2026-07-10: identical bytes on repeat fetches; the challenge page's "generated on every request" means seeded on-the-fly computation, not randomness). One cached snapshot per `(endpoint, network, start, end)` feeds KPIs + chart + CSV — now purely for dedup, instant navigation, and retry semantics. Promise-level cache with **rejection eviction** (a cached rejected promise would break Retry forever).
1b. **Daily values are window-seeded, not date-seeded** (verified): the same date differs across overlapping windows. Never mix daily rows from different window responses; each (network, window) response is its own consistent dataset. Documented in the README ambiguities table.
2. **No previous-period daily rows in the response** — only `previousTotals` + period bounds. But determinism makes the **ghost overlay** feasible: fetch the previous window directly (verified across all 3 networks × 7/14/30d windows: its totals equal `previousTotals` exactly), cache it like any snapshot, and draw it as a dashed day-offset-aligned line on the hero chart with a dual-value tooltip. Delta chips still read from the backend's `previousTotals`. Ghost overlay is the sole bonus feature and first on the cut list.
   **Ghost overlay correctness rules** (from independent review): (a) fetch the previous window using the response's `previousPeriod` bounds verbatim — never client-compute "start−N"; (b) align by serial-day integer offset from each window's start (pure ISO integer math — no ms arithmetic, DST-immune), never by array index alone; (c) guards assert `dailyData.length === windowDays`; (d) meta Combined ghost = combineMeta over the previous window, merged by offset (date sets are disjoint — a date-keyed merge produces silent holes); (e) **weekday-phase gate**: window lengths not divisible by 7 shift weekday alignment (at 30d, LinkedIn's weekend troughs land 2 days off and the overlay reads as a bug) → overlay renders only when `windowDays % 7 === 0` (7d/14d/21d/28d), with a one-line caption at other lengths ("comparison overlay disabled: periods don't align by weekday") — itself a documented judgment call.
2b. **Determinism across days is UNVERIFIED** (seed may include the server date). Pre-submission checklist: re-run the determinism + previousTotals checks the morning of submission; test fixtures are point-in-time captures and tests must not assume today's values.
3. **Summary totals are base-only** (impressions/clicks/spend/conversions) → dashboard rate KPIs (CTR, CPC) derived client-side from bases, for both periods, via the metric registry.
4. **`costPerConversion` exists only on Google rows/totals** → derivable everywhere from spend/conversions; the registry marks it derived for meta/linkedin, native for google.
5. **Meta has no combined rollup** → `combineMeta()`: per-date join (missing dates = zeros), sum base metrics, **recompute rates from summed bases** (never sum/average rates), **exclude reach** from Combined (audience overlap), combined engagement = shared fields only (likes, comments); shares (FB) / saves (IG) shown in per-platform views.
6. **API accepts future dates** → clamp picker AND URL-injected params to today; manual `YYYY-MM-DD` string parsing everywhere (never `new Date('YYYY-MM-DD')` — UTC off-by-one shifts every label in US timezones).
7. **LinkedIn weekends ≈ 7% of weekday volume** → weekend shading bands + "expected pattern" caption; first-class **undefined-delta** state ("—") for zero denominators/previous=0 so no NaN/Infinity ever renders.

## The hidden test (underspecified requirement) — README treatment

Top-of-README **ranked "ambiguities we caught" table** (Ambiguity → Question we'd ask → Implemented resolution → Where in code), ranked by confidence but with **no single catch crowned as "the" planted one** (revised after cross-model challenge — betting on one hidden answer key is a single point of failure):

1. **Spend delta favorability**. Resolution: three-valued direction registry — volume/engagement/CTR up-good, CPC/CPM/costPerConversion down-good, **spend neutral** (designed-neutral chip, direction arrow, tooltip pointing at cost-per-conversion). README explicitly acknowledges the literal-compliance tension ("delta on each metric indicating favorable/unfavorable") and the rejected alternative (contextual favorability).
2. **Meta rollup / derived-rate recomputation**: Combined | Facebook | Instagram segmented control; combined rates recomputed from summed bases, never averaged; reach excluded from Combined (audience overlap).
3. **CSV scope**: ONE uniform daily-grain contract everywhere (context columns: network, platform, periodStart, periodEnd; ISO dates; raw values), exported from the same in-memory snapshot the charts render. The dashboard export is the same grain over summary dailyData (all four platforms). No mixed-grain totals rows.
4. **Window-seeded daily values** (user-triggered discovery): the same date returns different values inside different windows (verified: 2026-07-01 google = 33,694 impressions in a 14d window, 35,100 in a 9d window). Question for Eulerity: intentional? Resolution: each (network, window) response is treated as its own consistent dataset; daily rows are never mixed across windows.
5. **Dashboard-vs-detail window mismatch**: summary is fixed 30d, detail defaults to 14d — numbers will disagree (window seeding makes this structural). Resolution: explicit window labels on every view + README note; not "fixed" because the API design forces it.
6. **Future dates**: API accepts them and fabricates data; picker and URL-injected params clamped to today, documented as deliberate.

Per the challenge page's invitation, the top two questions also get **actually sent to Eulerity** before finalizing; answers (or fallback resolutions) recorded in the README.

## Stack (mandated + defended choices)

- Vite + React 18 + TypeScript (strict), **bun** as package manager
- styled-components v6 (ThemeProvider tokens, styled.d.ts augmentation, transient $props — zero console warnings)
- react-router-dom v6
- **Recharts** over suggested react-google-charts — defended in README (external gstatic loader + options-object theming fight styled-components; spec permits equivalents)
- **papaparse** for CSV
- **vitest** (dev) — ~10 unit tests on pure lib only (clamps, combineMeta, deltas, CSV rows, guards) with fixtures captured from the live API
- Date picker: preset chips (7/14/30) + two styled native date inputs, clamp-on-apply. No calendar dep — keyboard-accessible by default, documented trade-off.
- **NOT built** (README list with rationales): auth, proxy (CORS open), dark-mode toggle, Redux/TanStack Query (staleTime-Infinity degenerate case — 60-line hook suffices), E2E tests, sessionStorage (URL owns range state).

## Architecture

```
src/
  theme.ts, styled.d.ts, GlobalStyle.ts     # tokens, fonts, reset, focus-visible, reduced-motion
  api/types.ts        # discriminated unions; meta nested shape modeled honestly; summary types separate
  api/guards.ts       # lean runtime trust boundary → ApiError('MALFORMED_RESPONSE')
  api/client.ts       # fetchJson + ApiError{code} from {error,message}; getSummary/getInsights
  api/cache.ts        # Map<key, Promise<T>>, rejection-evicting snapshot cache (dedup + instant
                      # nav + retry; data is deterministic per URL so caching is always safe)
  lib/dates.ts        # manual ISO parse/format, todayISO, clampRange (7–30, end≤today), defaultRange
  lib/metrics.ts      # METRIC_REGISTRY: label, format, direction(up/down/neutral), derived{num,den,scale}, availability per network
  lib/deltas.ts       # computeDelta (undefined-delta state), favorability
  lib/combineMeta.ts  # per-date join, sum bases, recompute rates, exclude reach
  lib/csv.ts          # buildCsvRows(snapshot, view) → Papa.unparse → Blob download
  hooks/useQuery.ts   # useQuerySnapshot: loading|error{retry}|success, AbortController + generation token
  hooks/useDateRange.ts  # URL ?start&end single source of truth; parse→clamp→replace canonicalization; picker Apply = push
  components/         # Sidebar, KpiCard, DeltaBadge, Sparkline, TimeSeriesChart (with optional
                      # ghost-overlay series), SegmentedControl, DateRangePicker, ExportButton,
                      # Skeletons (exact-layout), ErrorPanel, EmptyStates
  pages/              # DashboardPage, NetworkPage (config-driven per network), NotFound
  networks.ts         # per-network config: label, hue, metric set, extras (weekend bands, platform toggle)
  App.tsx             # ThemeProvider > BrowserRouter > Routes (/, /network/:id, *)
```

Nav links between network pages **preserve the current `?start&end`** (comparing channels over a hand-picked window is the core workflow).

## Build order (~10–12h equivalent; front-load trap-sensitive logic)

- **P0 — Rails (~45m):** scaffold, git init, theme + GlobalStyle + fonts, router shell, all routes render, deploy skeleton to Vercel (live link never becomes last-minute risk).
- **P1 — Data layer (~2.5h):** types, guards, client, cache, lib/* pure functions, **unit tests now** against live-captured fixtures, hooks.
- **P2 — Dashboard (~2h):** all-channel strip + 4 platform KpiCards (derived rate KPIs, delta chips, 30d sparklines from summary dailyData; FB and IG widgets both link to `/network/meta?platform=facebook|instagram`), exact-layout skeletons, error+retry. First demoable slice.
- **P3 — Network pages (~3.5h):** config-driven NetworkPage; URL-synced picker; KPI header with three-class deltas; main Recharts time-series with metric SegmentedControl; **ghost overlay** — previous window fetched as its own cached snapshot, drawn as dashed day-offset-aligned line with dual-value tooltip (Compare toggle; deltas stay default-visible per req #4; FIRST item on the cut list if P5 starts late); LinkedIn weekend bands; Meta Combined|FB|IG toggle (reads `?platform=`); explicit window labels in every page subtitle.
- **P4 — CSV export (~1h):** ONE uniform export contract everywhere — daily-grain rows from the rendered snapshot with context columns (network, platform, periodStart, periodEnd); the dashboard export is the same grain over summary dailyData (all four platforms). No second totals-grain format.
- **P5 — Polish + hardening (~1.5h):** 375/768/1280 pass (min-width:0 audit), keyboard pass, split contrast targets (≥3:1 chart marks / ≥4.5:1 text hues), custom Recharts tooltip, **chart a11y fallback** (each chart gets an aria-label + visually-hidden data table — a bare Recharts SVG is a screen-reader dead zone on the page's most important element), designed 404/error/empty states, console-warning sweep.
- **P6 — README + QA gauntlet + ship (~1.5h):** README written EARLY in the slot (it's the top-graded artifact): questions table, decisions table, NOT-built list, setup (bun + npm paths), screenshots, live link. Reviewer-path QA gauntlet. Push public repo.

## Commit discipline (reviewer-visible narrative)

Reviewers read the log before the code. Commit at every phase boundary and at every meaningful decision (including cuts), with messages that carry the reasoning ("feat(chart): gate ghost overlay to %7 windows — weekday phase misalignment at 30d"). Never let the repo materialize as three giant commits.

## QA gauntlet (pre-submit, from prior practice failures)

Fresh clone → install → dev under 60s · skeletons→widgets→click-through · range change updates deltas/chart with no stale flash (rapid-fire changes) · hand-edited URL: 40-day window, future dates, garbage → clamped or designed error · CSV opens clean in Excel (ISO dates, uniform grain) · offline → error + working Retry (rejection eviction proven) · /nonsense → designed 404 · 375px no horizontal scroll · zero console errors · deep-link every route directly · ghost overlay: verify 14d shows it, 30d shows the disabled caption · **morning-of-submission: re-run determinism + previousTotals verification** (constraint 2b).
