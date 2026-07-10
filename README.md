# Eulerity Metrics

A multi-channel marketing dashboard for Facebook, Google, Instagram, and LinkedIn ad performance: one overview page, three network detail pages, period-over-period deltas, and CSV export, built on the Eulerity Web Challenge 2026 API.

**Live demo:** https://eulerity-metrics.vercel.app

<!-- screenshots: dashboard overview, network detail with ghost overlay, CSV output in Excel -->

## Setup and run

Requires Node 18+.

With bun:

```bash
bun install
bun run dev       # http://localhost:5173
bun run build
bun run test
```

With npm:

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run test
```

No environment variables and no proxy. The API (`https://eulerity-hackathon.appspot.com`) has open CORS, so the app calls it directly from the browser.

## Ambiguities we caught — questions we would ask

The challenge states that at least one requirement is intentionally underspecified and asks us to catch it. We found six candidates. Rather than betting on which one is "the" planted ambiguity, we documented all of them, ranked by confidence, each with the question we would ask and the resolution we shipped.

| # | Ambiguity | Question we'd ask | Implemented resolution | Where in code |
|---|---|---|---|---|
| 1 | **Spend delta favorability.** Req #4 says show a favorable/unfavorable delta on *each* metric, but spend has no intrinsic direction: spend up with conversions up is scale, spend up with conversions flat is waste. | "Should spend increases be colored unfavorable, favorable, or neutral? What business framing do your customers expect?" | Three-valued direction registry: volume/engagement/CTR are up-good, CPC/CPM/costPerConversion are down-good, and spend is **neutral** (delta value and arrow shown, neutral color, tooltip pointing the reader at cost per conversion). We acknowledge the literal-compliance tension with "favorable/unfavorable on each metric" and rejected the alternative (contextual favorability inferred from conversions) as too clever to be trustworthy. | `src/lib/metrics.ts` (direction field), `src/lib/deltas.ts`, `src/components/DeltaBadge.tsx` |
| 2 | **Meta rollup and derived rates.** The API returns Facebook and Instagram separately with no combined totals. Combined or side-by-side? | "Should Meta be presented as one combined channel, two platforms, or both? If combined, do you expect rates recomputed from summed bases?" | Both: a Combined \| Facebook \| Instagram segmented control. Combined sums base metrics per date and **recomputes rates from the summed bases** (never sums or averages rates, per the API's own rate-field rule). Reach is excluded from Combined (audience overlap makes the sum wrong); combined engagement uses only shared fields (likes, comments), with shares (FB) and saves (IG) shown per-platform. | `src/lib/combineMeta.ts`, `src/components/SegmentedControl.tsx`, `src/pages/NetworkPage.tsx` |
| 3 | **CSV scope.** Req #5 says export "the relevant data" that "reflects the current view" and is "useful on its own". Daily rows or totals? Previous period? Dashboard too? | "Should the export be daily-grain rows, totals, or both? Should it include the comparison period?" | ONE uniform daily-grain contract everywhere: the current view's daily rows plus context columns (network, platform, periodStart, periodEnd), ISO dates, raw values, exported from the exact in-memory snapshot the charts render. The dashboard export is the same grain over the summary dailyData for all four platforms. No mixed-grain totals rows (totals are recomputable via SUM). | `src/lib/csv.ts`, `src/lib/__tests__/csv.test.ts` |
| 4 | **Window-seeded daily values.** The same calendar date returns different numbers depending on the requested window (verified: 2026-07-01 Google impressions = 33,694 inside a 06-26 to 07-09 window, 35,100 inside a 07-01 to 07-09 window). | "Is window-dependent seeding intentional? Should clients treat overlapping windows as independent datasets?" | Each (network, window) response is treated as its own internally consistent dataset. Daily rows are never mixed across window responses, and the snapshot cache keys on the full (endpoint, network, start, end) tuple. | `src/api/cache.ts`, `src/hooks/useQuery.ts` |
| 5 | **Dashboard vs detail window mismatch.** The summary endpoint is a fixed 30-day window; detail pages default to 14 days. Because of window seeding (#4), the numbers will disagree even for the same dates. | "Is it acceptable that the dashboard and detail pages show different values for the same date? Should the dashboard link carry a window?" | Not "fixed", because the API design makes it structural. Instead, every view carries an explicit window label in its subtitle so the mismatch is legible rather than mysterious. | `src/pages/DashboardPage.tsx`, `src/pages/NetworkPage.tsx` |
| 6 | **Future dates.** The API happily fabricates data for future dates (`endDate=2026-07-20` returns synthetic future metrics). | "Should the picker allow future dates since the API accepts them?" | No. Both the picker and URL-injected params are clamped to today (and to the 7 to 30 day window), as a deliberate product decision documented here. | `src/lib/dates.ts` (`clampRange`, `todayISO`), `src/hooks/useDateRange.ts` |

Per the challenge page's invitation, the top two questions were also sent to Eulerity before finalizing; answers (or these fallback resolutions) stand as recorded above.

## API forensics

Everything below was probed against the live API on 2026-07-10 and drives the architecture.

- **Deterministic per URL.** Repeated fetches of the same URL are byte-identical on both endpoints. The challenge page's "generated on every request" means seeded on-the-fly computation, not randomness. This makes responses safely cacheable per (endpoint, network, start, end).
- **Daily values are seeded by the window, not the date.** The same date differs across overlapping windows: 2026-07-01 Google impressions = 33,694 in a 14-day (06-26 to 07-09) window but 35,100 in a 9-day (07-01 to 07-09) window. Each window response is its own consistent dataset; we never merge daily rows across windows.
- **`previousTotals` exactly equals a direct fetch of the previous window.** Verified across all 3 networks and 7/14/30-day windows. This is what makes the ghost comparison overlay provably consistent with the backend's own comparison math: one extra request for the `previousPeriod` bounds yields daily rows whose totals match `previousTotals` to the cent.
- **Summary totals are base-only** (impressions, clicks, spend, conversions). Dashboard rate KPIs (CTR, CPC) are derived client-side from bases, for both periods, through the metric registry.
- **`costPerConversion` exists only on Google** rows and totals. The registry marks it native for Google and derived (spend / conversions) elsewhere.
- **LinkedIn weekends run at roughly 7% of weekday volume** (intentional per the challenge page: FB about +30%, IG about +45%, Google about -25% on weekends). We surface it with weekend shading bands and an "expected pattern" caption instead of letting it read as a data bug.

## Requirement map

| # | Requirement | Where implemented |
|---|---|---|
| 1 | Dashboard page with summary widgets for all four platforms, each linking to its detail page | `src/pages/DashboardPage.tsx`, `src/components/KpiCard.tsx`, `src/api/client.ts` (`getSummary`) |
| 2 | One detail page per network (Meta, Google, LinkedIn) that goes deeper than the dashboard | `src/pages/NetworkPage.tsx` (config-driven), `src/networks.ts` |
| 3 | At least one time-series chart per network page | `src/components/TimeSeriesChart.tsx` with a metric segmented control (`src/components/SegmentedControl.tsx`) |
| 4 | Date-range picker (default 14d, min 7, max 30), backend comparison window, favorable/unfavorable delta on each metric | `src/components/DateRangePicker.tsx`, `src/hooks/useDateRange.ts`, `src/lib/deltas.ts`, `src/components/DeltaBadge.tsx` |
| 5 | CSV export reflecting the current view with enough context to stand alone | `src/lib/csv.ts`, `src/components/ExportButton.tsx` |
| 6 | Dashboard to network navigation with no full page reload | `src/App.tsx` (react-router-dom v6 routes), `src/components/Sidebar.tsx` |

## Architecture notes

- **Snapshot cache with rejection eviction** (`src/api/cache.ts`). A `Map<key, Promise<T>>` keyed on the full request tuple. Determinism makes caching always safe, so the cache exists purely for dedup, instant back/forward navigation, and retry semantics. Rejected promises are evicted on rejection; a cached rejection would break the Retry button forever.
- **Metric registry** (`src/lib/metrics.ts`). Every metric declares its label, formatter, delta direction (up-good, down-good, neutral), availability per network, and, when derived, its numerator/denominator over base metrics. KPI tiles, chart options, deltas, and CSV headers all read from this one table, so a metric's behavior is defined exactly once.
- **combineMeta rules** (`src/lib/combineMeta.ts`). Per-date join of Facebook and Instagram (missing dates fill as zeros), sum base metrics, recompute rates from summed bases (never sum or average rates), exclude reach from Combined, restrict combined engagement to shared fields.
- **URL as state** (`src/hooks/useDateRange.ts`). `?start&end` is the single source of truth for the range: parsed, clamped, and canonicalized with a `replace` on load; picker Apply pushes. Deep links, refresh, and back/forward all just work, and nav links between network pages preserve the current range because comparing channels over a hand-picked window is the core workflow. No sessionStorage.
- **Ghost overlay and the %7 weekday gate** (`src/components/TimeSeriesChart.tsx`). The previous period is fetched as its own cached snapshot using the response's `previousPeriod` bounds verbatim (never client-computed), aligned by serial-day integer offset from each window's start (pure ISO integer math, DST-immune), and drawn as a dashed line with a dual-value tooltip. The overlay renders only when `windowDays % 7 === 0`: window lengths not divisible by 7 shift weekday alignment, and at 30 days LinkedIn's weekend troughs land 2 days off and the overlay reads as a bug. Other lengths show a one-line caption explaining why the overlay is off. Delta chips always read the backend's `previousTotals`, never the overlay.
- **Pure-lib testing strategy** (`src/lib/__tests__/`, fixtures in `src/api/__fixtures__/`). Unit tests target only pure functions (clamps, combineMeta, deltas, CSV rows, guards) against fixtures captured from the live API. Caveat: determinism across server days is unverified (the seed may include the server date), so fixtures are point-in-time captures and no test assumes today's live values.

## Decisions

| Decision | Rationale |
|---|---|
| **Recharts** over suggested react-google-charts | react-google-charts loads the renderer from gstatic at runtime and themes through an options object, both of which fight styled-components token theming and offline determinism. The spec explicitly permits "any equivalent". Recharts is React-native SVG, theme-driven, and testable. |
| **No state library** (no Redux, no TanStack Query) | The app's server state is deterministic and immutable per URL, which is TanStack Query's degenerate case (staleTime: Infinity, no invalidation, no mutation). A 60-line hook over a promise cache covers dedup, abort, retry, and loading/error states without the dependency. |
| **Native date inputs** with preset chips (7/14/30) | Keyboard-accessible and localized for free, zero dependency weight, clamp-on-apply covers validation. Trade-off: less visual polish than a custom calendar; accepted deliberately. |
| **Spend delta rendered neutral** | Spend has no intrinsic favorable direction (see ambiguity #1). Coloring it green or red would assert a judgment the data cannot support; cost per conversion is the metric that carries that judgment. |

## NOT built

- **Auth**: the API is public and unauthenticated; any auth layer would be theater.
- **API proxy**: CORS is fully open (`access-control-allow-origin: *`), so a proxy adds latency and a server to run for zero benefit.
- **Dark mode**: a second theme doubles the QA surface of every chart and contrast target without touching any requirement.
- **TanStack Query**: deterministic immutable data is its degenerate case; see Decisions.
- **E2E tests**: unit tests on the pure lib cover the logic that can actually break; browser E2E for a 6-route app is cost without proportional signal in a take-home window.

## Known limitations

- **Overlapping ranges disagree by design.** Daily values are seeded by the requested window, not the date, so the dashboard (fixed 30d) and a detail page (say 14d) show different numbers for the same date. This is an API property, not a client bug; every view labels its window explicitly.
- **30-day comparison overlay is disabled.** Window lengths not divisible by 7 misalign weekday phase (LinkedIn's near-zero weekends land 2 days off), so the ghost overlay only renders for 7/14/21/28-day windows, with a caption at other lengths. Delta chips remain available at every length.
- **Fixtures are point-in-time.** Cross-day determinism of the API is unverified (the seed may include the server date), so test fixtures are captures from 2026-07-10 and tests assert against those captures, not live values.
