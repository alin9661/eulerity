# Eulerity Web Challenge 2026 — Specification Sheet

**Challenge:** Multi-Channel Marketing Dashboard
**Source:** https://eulerity-hackathon.appspot.com/web-2026.html
**API base:** `https://eulerity-hackathon.appspot.com` (verified live 2026-07-10)
**Submission:** public GitHub repo + README with setup/run instructions → [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSdfnfPFfyCuUBRFS-jRvO1m75amxd-85-Dvar29ROX4petEFA/viewform)

Build a dashboard that visualizes ad performance across **Facebook, Google, Instagram, LinkedIn**. Two API endpoints; the job is to consume them, make the data legible, and give users tools to act on it. The stated requirements are "the floor" — the challenge is intentionally open-ended.

> **Hidden test:** "At least one requirement below is intentionally underspecified — we want to see you catch it and ask. … The questions you ask matter as much as the code you write." Document the question + proposed resolution in the README. See §6.

---

## 1. Mandatory requirements (the floor)

| # | Requirement | Detail |
|---|---|---|
| 1 | **Dashboard page** | Single overview page, summary widgets for all four platforms. Each widget = quick KPI read + link to its detail page. Data: `GET /v1/metrics-summary` (fixed 30-day rolling window, no params). |
| 2 | **One page per network** | Detail pages for **Meta** (Facebook + Instagram), **Google**, **LinkedIn**. Must go deeper than the dashboard: platform-specific metrics, trends over time, explorable data. |
| 3 | **Charts** | ≥1 time-series chart per network page. Multiple charts → deliberate presentation (tabs / toggle / layered). |
| 4 | **Date range + comparison** | Detail pages need a date-range picker. Default **14 days**, min **7**, max **30**. Comparison window (equal length, immediately before) is computed by the backend and returned as `previousPeriod` — no second picker. Show a **delta on each metric** indicating favorable/unfavorable change. |
| 5 | **CSV export** | "Export the relevant data as a CSV file. The export should reflect the current view and include enough context to be useful on its own." |
| 6 | **Navigation** | Dashboard ↔ network pages with no full page reload (`react-router-dom`). |

## 2. Mandatory tech stack

| Layer | Requirement |
|---|---|
| Language | TypeScript |
| Framework | React |
| Styling | styled-components |
| Routing | react-router-dom |
| Charts | Chart library — they suggest react-google-charts, "any equivalent is fine" |
| CSV | A CSV library (e.g. papaparse) — "don't hand-roll string concatenation" |

Everything else is your call — "just be ready to explain why."

## 3. API reference (verified against live API)

### `GET /v1/metrics-summary`
Window is always today−29d (current) + the 30 days before that (previous). No parameters.

```jsonc
{
  "period":         { "startDate": "2026-06-11", "endDate": "2026-07-10" },
  "previousPeriod": { "startDate": "2026-05-12", "endDate": "2026-06-10" },
  "meta": {
    "facebook":  { "totals": {…}, "previousTotals": {…}, "dailyData": [ … ] },
    "instagram": { "totals": {…}, "previousTotals": {…}, "dailyData": [ … ] }
  },
  "google":   { "totals": {…}, "previousTotals": {…}, "dailyData": [ … ] },
  "linkedin": { "totals": {…}, "previousTotals": {…}, "dailyData": [ … ] }
}
```
Summary rows/totals carry **base metrics only**: `date, impressions, clicks, spend, conversions` — no rate fields.

### `GET /v1/metrics-insights?network=<meta|google|linkedin>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>`
Window must be 7–30 days inclusive. Top-level shape: `{ network, period, previousPeriod, totals, previousTotals, dailyData }`.

**The response is polymorphic on `network`:**

| network | `totals` / `previousTotals` | `dailyData` | Daily row fields (beyond base + `ctr,cpc,cpm`) |
|---|---|---|---|
| `meta` | `{ facebook: {…}, instagram: {…} }` — split, **no combined rollup** | `{ facebook: [...], instagram: [...] }` | FB: `reach, likes, comments, shares` · IG: `reach, likes, comments, saves` |
| `google` | flat object | flat array | `costPerConversion` (0 when no conversions) |
| `linkedin` | flat object | flat array | `likes, comments, shares, follows` |

**Rate-field rule (verbatim):** `ctr`, `cpc`, `cpm`, `costPerConversion` in `totals`/`previousTotals` are **recalculated from summed base values, not averaged from daily rates**. Any client-side aggregation (e.g. a combined Meta rollup) must do the same: sum bases, then recompute — never sum or average rates.

### Errors — all return `{ "error": "CODE", "message": "..." }`

| Status | Code | Trigger |
|---|---|---|
| 400 | `MISSING_PARAM` | required param absent |
| 400 | `INVALID_NETWORK` | network ∉ {meta, google, linkedin} |
| 400 | `INVALID_DATE_FORMAT` | not YYYY-MM-DD |
| 400 | `INVALID_DATE_RANGE` | endDate before startDate |
| 400 | `WINDOW_TOO_SMALL` / `WINDOW_TOO_LARGE` | <7 days / >30 days |
| 404 | `NOT_FOUND` | path mismatch |
| 405 | `METHOD_NOT_ALLOWED` | non-GET |

## 4. Verified API gotchas (probed live, 2026-07-10)

1. **Synthetic data regenerates on every request** (sine-wave trend ± 15% noise, no database). Two identical queries return different numbers → KPIs, chart, and CSV export **must be derived from one fetched snapshot**; cache per `(network, startDate, endDate)` for UI coherence, not just performance.
2. **Future dates are accepted** — `endDate=2026-07-20` happily returns synthetic future data. The frontend must clamp the picker to today (and say so in the README).
3. **Meta has no combined rollup** — client must either present Facebook/Instagram separately or compute a combined view (summing bases, recomputing rates).
4. **CORS is fully open** (`access-control-allow-origin: *`) — call the API directly, no proxy.
5. Window validation is inclusive-of-endpoints: 7-day and 30-day windows pass; 6 days → `WINDOW_TOO_SMALL`.
6. **Weekend patterns are intentional**: FB ≈ +30%, IG ≈ +45%, Google ≈ −25%, LinkedIn drops to **~7% of weekday volume** — "near-zero weekends are expected, not a bug." Worth surfacing in the UI rather than explaining away.

## 5. Data types (per challenge page)

- **SummaryMetrics** (summary endpoint): `date, impressions, clicks, spend (USD), conversions`
- **DailyMetrics** (insights base): + `ctr (%), cpc (USD), cpm (USD/1k impressions)`
- **FacebookDailyMetrics**: + `reach, likes, comments, shares`
- **InstagramDailyMetrics**: + `reach, likes, comments, saves`
- **GoogleDailyMetrics**: + `costPerConversion (USD; 0 when no conversions)`
- **LinkedInDailyMetrics**: + `likes, comments, shares, follows`

## 6. The underspecified-requirement analysis (the hidden test)

Ranked candidates for "the intentionally underspecified requirement," each with the question to ask and a proposed resolution to document in the README:

1. **Delta favorability for spend** (req #4 says show favorable/unfavorable on *each* metric). CTR/conversions up = favorable; CPC/CPM/cost-per-conversion down = favorable. But **spend has no intrinsic direction** — spend up with conversions up is scale, spend up with conversions flat is waste. *Proposed resolution:* treat spend as **neutral** (delta shown, colored neutrally), and document the per-metric directionality map. This is the strongest candidate — it's inside a mandatory requirement and has no correct default.
2. **CSV export scope** (req #5: "the relevant data … current view … useful on its own"). Daily rows or totals? Include `previousPeriod`? Dashboard too, or detail pages only? *Proposed resolution:* export the current view's daily rows for the selected range with context columns (network, platform, period bounds), plus a totals/comparison block; export available on every page that shows data.
3. **Meta presentation**: combined rollup vs side-by-side (API provides no combined totals). *Proposed resolution:* show both — combined KPIs computed correctly (summed bases → recomputed rates) with a platform toggle/split for detail.
4. **Future dates**: API accepts them; should the picker? *Proposed resolution:* clamp to today.

## 7. Judgment guidance (verbatim cues from the page)

- "We care more about **judgment** — knowing what to add and what to leave out — than feature count."
- "Bonus work should be clearly bonus; don't sacrifice core requirements to add extras."
- Networks/platforms are fixed; only GET is supported; must run in a browser.
