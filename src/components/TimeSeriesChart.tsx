import { useId, useMemo, useState } from 'react'
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceArea,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import styled, { useTheme } from 'styled-components'
import type { InsightsResponse, Network, Period } from '../api/types'
import { useInsights } from '../hooks/useQuery'
import { diffDays, parseISO, rangeLengthDays, toSerialDay } from '../lib/dates'
import { METRIC_REGISTRY, formatMetric } from '../lib/metrics'
import type { MetricFormat, MetricKey } from '../lib/metrics'
import { ChartDataTable } from './ChartDataTable'
import { SegmentedControl } from './SegmentedControl'

// ---------------------------------------------------------------------------
// Date labels — manual formatting only. `new Date('YYYY-MM-DD')` parses as UTC
// midnight, so local getters shift every label a day earlier anywhere west of
// Greenwich (lib/dates.ts owns the arithmetic; these own the words).
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** 'Jul 7' */
export function formatShortDate(iso: string): string {
	const { m, d } = parseISO(iso)
	return `${MONTHS[m - 1]} ${d}`
}

/** Serial day 0 = 1970-01-01, a Thursday — so +4 lands Sunday on 0. */
export function weekdayShort(iso: string): string {
	return WEEKDAYS[(toSerialDay(iso) + 4) % 7]
}

/** 'Jun 27 – Jul 10, 2026' (year repeated only when the range spans one). */
export function formatRangeLabel(period: Period): string {
	const s = parseISO(period.startDate)
	const e = parseISO(period.endDate)
	const startLabel = `${MONTHS[s.m - 1]} ${s.d}`
	const endLabel = `${MONTHS[e.m - 1]} ${e.d}, ${e.y}`
	return s.y === e.y ? `${startLabel} – ${endLabel}` : `${startLabel}, ${s.y} – ${endLabel}`
}

function isWeekend(iso: string): boolean {
	const dow = (toSerialDay(iso) + 4) % 7
	return dow === 0 || dow === 6
}

// ---------------------------------------------------------------------------

export interface TimeSeriesChartProps {
	network: Network
	/** Names the chart for the aria-label and the sr-only table caption */
	heading: string
	/** Current window's rows, already resolved to the rendered view */
	rows: ReadonlyArray<{ date: string }>
	/**
	 * Resolves the rendered view's rows from ANY window's response — reused
	 * verbatim on the ghost window so meta Combined ghosts go through the same
	 * combineMeta policy as the current series.
	 */
	selectRows: (res: InsightsResponse) => ReadonlyArray<{ date: string }>
	metricKeys: readonly MetricKey[]
	period: Period
	previousPeriod: Period
	/** Platform mark hue; omitted -> brand blue->violet gradient (meta Combined) */
	hue?: string
	weekendBands?: boolean
	footnote?: string
}

interface Datum {
	date: string
	value: number | null
	prevDate: string | null
	prevValue: number | null
}

export function TimeSeriesChart(props: TimeSeriesChartProps) {
	const { metricKeys, period } = props

	const [selected, setSelected] = useState<MetricKey>(metricKeys[0])
	// Selection can outlive a metric-set change (platform/network view switch)
	const metric = metricKeys.includes(selected) ? selected : metricKeys[0]

	// Weekday-phase gate: lengths not divisible by 7 shift weekday alignment
	// (LinkedIn's weekend troughs land days off and the overlay reads as a bug).
	const ghostEligible = rangeLengthDays(period.startDate, period.endDate) % 7 === 0
	const [compare, setCompare] = useState(true)
	const showGhost = ghostEligible && compare

	const metricOptions = useMemo(
		() => metricKeys.map((key) => ({ value: key, label: METRIC_REGISTRY[key].label })),
		[metricKeys],
	)

	const plotProps = { ...props, metric, ghostEligible }

	return (
		<Root>
			<Toolbar>
				<SegmentedControl options={metricOptions} value={metric} onChange={setSelected} ariaLabel="Chart metric" />
				{ghostEligible && (
					<CompareToggle>
						<input
							type="checkbox"
							checked={compare}
							onChange={(event) => setCompare(event.target.checked)}
						/>
						Compare vs previous period
					</CompareToggle>
				)}
			</Toolbar>
			{showGhost ? <GhostPlot {...plotProps} /> : <Plot {...plotProps} prevRows={null} />}
			{props.footnote !== undefined && <Footnote>{props.footnote}</Footnote>}
		</Root>
	)
}

interface PlotProps extends TimeSeriesChartProps {
	metric: MetricKey
	ghostEligible: boolean
	/** null = no ghost (ineligible, toggled off, in-flight, or failed) */
	prevRows: ReadonlyArray<{ date: string }> | null
}

/**
 * Own component so the previous-window fetch only mounts when the overlay can
 * actually render (hooks can't be called conditionally inline). Bounds come
 * from the response's `previousPeriod` VERBATIM — never client-computed
 * "start − N", which could disagree with the backend's own comparison window.
 */
function GhostPlot(props: Omit<PlotProps, 'prevRows'>) {
	const { network, previousPeriod, selectRows } = props
	const state = useInsights(network, previousPeriod.startDate, previousPeriod.endDate)
	// In-flight or failed -> silently omit the line; the current series stands alone
	const prevRows = state.status === 'success' ? selectRows(state.data) : null
	return <Plot {...props} prevRows={prevRows} />
}

function Plot({
	heading,
	rows,
	prevRows,
	metric,
	period,
	previousPeriod,
	hue,
	weekendBands,
	ghostEligible,
}: PlotProps) {
	const theme = useTheme()
	// useId can contain ':' — legal in HTML ids but brittle inside url(#...)
	const gradientRoot = useId().replace(/:/g, '')
	const fillId = `fill-${gradientRoot}`
	const strokeId = `stroke-${gradientRoot}`

	const def = METRIC_REGISTRY[metric]

	// Equal-length assert: a prev window of a different length cannot pair
	// index-for-index with the current one — omit the ghost rather than lie.
	const usablePrev = prevRows !== null && prevRows.length === rows.length ? prevRows : null

	const data = useMemo<Datum[]>(() => {
		// Align by serial-day offset from each window's own start (pure integer
		// math, DST-immune) — date sets are disjoint, so a date-keyed join would
		// produce silent holes.
		const prevByOffset = new Map<number, { date: string; value: number | null }>()
		if (usablePrev) {
			for (const row of usablePrev) {
				prevByOffset.set(diffDays(previousPeriod.startDate, row.date), {
					date: row.date,
					value: metricOf(row, metric),
				})
			}
		}
		return rows.map((row) => {
			const prev = usablePrev ? prevByOffset.get(diffDays(period.startDate, row.date)) : undefined
			return {
				date: row.date,
				value: metricOf(row, metric),
				prevDate: prev?.date ?? null,
				prevValue: prev?.value ?? null,
			}
		})
	}, [rows, usablePrev, metric, period.startDate, previousPeriod.startDate])

	const ghostShown = usablePrev !== null
	const bands = useMemo(() => (weekendBands ? weekendSpans(rows) : []), [weekendBands, rows])

	const stroke = hue ?? `url(#${strokeId})`
	const fillTop = hue ?? theme.colors.accentFrom
	const fillBottom = hue ?? theme.colors.accentTo

	return (
		<>
			{/* role="img": the raw Recharts SVG is a screen-reader dead zone — AT
			    gets the label here and the real data from the table below. */}
			<PlotWrap role="img" aria-label={`${heading}: ${def.label} by day, ${formatRangeLabel(period)}`}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
						<defs>
							<linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={fillTop} stopOpacity={0.26} />
								<stop offset="100%" stopColor={fillBottom} stopOpacity={0.02} />
							</linearGradient>
							<linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor={theme.colors.accentFrom} />
								<stop offset="100%" stopColor={theme.colors.accentTo} />
							</linearGradient>
						</defs>
						{bands.map((band) => (
							<ReferenceArea
								key={band.x1}
								x1={band.x1}
								x2={band.x2}
								fill={theme.colors.fill}
								fillOpacity={0.8}
								strokeOpacity={0}
							/>
						))}
						<CartesianGrid vertical={false} stroke={theme.colors.border} />
						<XAxis
							dataKey="date"
							tickFormatter={formatShortDate}
							tick={{ fill: theme.colors.inkMuted, fontSize: 11 }}
							tickLine={false}
							axisLine={{ stroke: theme.colors.border }}
							interval={Math.max(0, Math.ceil(data.length / 10) - 1)}
							tickMargin={8}
						/>
						<YAxis
							width={52}
							tick={{ fill: theme.colors.inkMuted, fontSize: 11 }}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value: number) => axisTick(value, def.format)}
						/>
						<Tooltip
							cursor={{ stroke: theme.colors.border, strokeWidth: 1 }}
							isAnimationActive={false}
							content={(tip: TooltipProps<number, string>) => (
								<ChartTip
									active={tip.active}
									payload={tip.payload}
									metricLabel={def.label}
									format={def.format}
									markColor={hue ?? theme.colors.accentFrom}
									ghost={ghostShown}
								/>
							)}
						/>
						{ghostShown && (
							<Line
								type="monotone"
								dataKey="prevValue"
								stroke={theme.colors.inkMuted}
								strokeWidth={1.5}
								strokeDasharray="5 4"
								dot={false}
								activeDot={{ r: 3, fill: theme.colors.inkMuted, strokeWidth: 0 }}
								isAnimationActive={false}
							/>
						)}
						<Area
							type="monotone"
							dataKey="value"
							stroke={stroke}
							strokeWidth={2}
							fill={`url(#${fillId})`}
							dot={false}
							activeDot={{ r: 4, stroke: theme.colors.surface, strokeWidth: 2 }}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</PlotWrap>
			<CaptionRow aria-live="polite">
				{!ghostEligible
					? "Comparison overlay disabled for this window: periods don't align by weekday"
					: ghostShown
						? `Dashed line — previous period (${formatRangeLabel(previousPeriod)})`
						: ' ' /* keeps the caption line's space stable while a ghost fetch is in flight */}
			</CaptionRow>
			<ChartDataTable
				caption={`${heading} — ${def.label} by day, ${formatRangeLabel(period)}`}
				metricLabel={def.label}
				format={def.format}
				points={data}
				previousLabel={ghostShown ? `Previous period (${formatRangeLabel(previousPeriod)})` : undefined}
			/>
		</>
	)
}

function metricOf(row: { date: string }, key: MetricKey): number | null {
	// Interface rows (GoogleDaily, …) have no index signature; combined rows
	// carry legitimate nulls (rates with zero denominators) -> null = gap.
	const value = (row as Record<string, unknown>)[key]
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Consecutive Sat/Sun runs, as category-axis endpoints for ReferenceArea. */
function weekendSpans(rows: ReadonlyArray<{ date: string }>): Array<{ x1: string; x2: string }> {
	const spans: Array<{ x1: string; x2: string }> = []
	let open: { x1: string; x2: string } | null = null
	for (const row of rows) {
		if (isWeekend(row.date)) {
			if (open) {
				open.x2 = row.date
			} else {
				open = { x1: row.date, x2: row.date }
				spans.push(open)
			}
		} else {
			open = null
		}
	}
	return spans
}

function trimmed(value: number): string {
	return String(Math.round(value * 10) / 10)
}

function compactTick(value: number): string {
	if (Math.abs(value) >= 1_000_000) return `${trimmed(value / 1_000_000)}M`
	if (Math.abs(value) >= 1_000) return `${trimmed(value / 1_000)}k`
	return trimmed(value)
}

function axisTick(value: number, format: MetricFormat): string {
	switch (format) {
		case 'percent':
			return `${trimmed(value)}%`
		case 'currency':
		case 'currency-precise':
			return `$${compactTick(value)}`
		default:
			return compactTick(value)
	}
}

// ---------------------------------------------------------------------------
// Tooltip — custom themed component; the Recharts default carries its own grey
// border/background that clash with the card system.
// ---------------------------------------------------------------------------

interface ChartTipProps {
	active?: boolean
	payload?: TooltipProps<number, string>['payload']
	metricLabel: string
	format: MetricFormat
	markColor: string
	ghost: boolean
}

function ChartTip({ active, payload, metricLabel, format, markColor, ghost }: ChartTipProps) {
	const datum = payload && payload.length > 0 ? (payload[0].payload as Datum) : null
	if (!active || !datum) return null
	return (
		<TipBox>
			<TipDate>
				{weekdayShort(datum.date)}, {formatShortDate(datum.date)}
			</TipDate>
			<TipRow>
				<TipSwatch $color={markColor} aria-hidden="true" />
				<span>{metricLabel}</span>
				<TipValue>{formatMetric(datum.value, format)}</TipValue>
			</TipRow>
			{ghost && datum.prevDate !== null && (
				<TipRow $muted>
					<TipDash aria-hidden="true" />
					<span>
						{weekdayShort(datum.prevDate)}, {formatShortDate(datum.prevDate)}
					</span>
					<TipValue>{formatMetric(datum.prevValue, format)}</TipValue>
				</TipRow>
			)}
		</TipBox>
	)
}

// ---------------------------------------------------------------------------

const Root = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};
	min-width: 0;
`

const Toolbar = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: ${({ theme }) => theme.space(3)};
`

const CompareToggle = styled.label`
	display: inline-flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
	font-size: 13px;
	font-weight: 600;
	color: ${({ theme }) => theme.colors.inkMuted};
	cursor: pointer;
	white-space: nowrap;

	input {
		accent-color: ${({ theme }) => theme.colors.accentFrom};
		width: 16px;
		height: 16px;
		margin: 0;
		cursor: pointer;
	}
`

/* min-width: 0 — a Recharts ResponsiveContainer inside a grid/flex track
   otherwise forces the track wider than the viewport (the overflow trap) */
const PlotWrap = styled.div`
	min-width: 0;
	width: 100%;
	height: 300px;
`

const CaptionRow = styled.p`
	min-height: 18px;
	font-size: 12px;
	color: ${({ theme }) => theme.colors.inkMuted};
`

const Footnote = styled.p`
	font-size: 12px;
	color: ${({ theme }) => theme.colors.inkMuted};
	border-top: 1px solid ${({ theme }) => theme.colors.border};
	padding-top: ${({ theme }) => theme.space(2)};
`

const TipBox = styled.div`
	background: ${({ theme }) => theme.colors.surface};
	border: 1px solid ${({ theme }) => theme.colors.border};
	border-radius: ${({ theme }) => theme.radii.md};
	box-shadow: ${({ theme }) => theme.shadows.raised};
	padding: ${({ theme }) => theme.space(3)};
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(1.5)};
	min-width: 190px;
`

const TipDate = styled.div`
	font-size: 12px;
	font-weight: 700;
	color: ${({ theme }) => theme.colors.ink};
`

const TipRow = styled.div<{ $muted?: boolean }>`
	display: flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
	font-size: 13px;
	color: ${({ theme, $muted }) => ($muted ? theme.colors.inkMuted : theme.colors.ink)};
`

const TipValue = styled.span`
	margin-left: auto;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
`

const TipSwatch = styled.span<{ $color: string }>`
	width: 10px;
	height: 10px;
	flex: none;
	border-radius: ${({ theme }) => theme.radii.pill};
	background: ${({ $color }) => $color};
`

const TipDash = styled.span`
	width: 12px;
	flex: none;
	border-top: 2px dashed ${({ theme }) => theme.colors.inkMuted};
`
