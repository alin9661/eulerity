import { useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import type { InsightsResponse, Period } from '../api/types'
import { Card } from '../components/Card'
import { DateRangePicker } from '../components/DateRangePicker'
import { DeltaBadge } from '../components/DeltaBadge'
import { ErrorPanel } from '../components/ErrorPanel'
import { ExportButton } from '../components/ExportButton'
import { SegmentedControl } from '../components/SegmentedControl'
import type { SegmentedOption } from '../components/SegmentedControl'
import { TimeSeriesChart, formatRangeLabel } from '../components/TimeSeriesChart'
import { KpiGrid, NetworkSkeleton } from '../components/skeletons/NetworkSkeleton'
import { useDateRange } from '../hooks/useDateRange'
import { useInsights } from '../hooks/useQuery'
import { combineMeta, combineMetaTotals } from '../lib/combineMeta'
import { buildCsvRows, csvFilename } from '../lib/csv'
import type { CsvRow, CsvSection } from '../lib/csv'
import { computeDelta } from '../lib/deltas'
import { METRIC_REGISTRY, deriveRate, formatMetric } from '../lib/metrics'
import type { MetricBag, MetricDirection, MetricFormat, MetricKey } from '../lib/metrics'
import { rangeLengthDays } from '../lib/dates'
import { NETWORKS, isNetworkId } from '../networks'
import type { NetworkConfig } from '../networks'
import NotFoundPage from './NotFoundPage'

// ---------------------------------------------------------------------------
// View resolution — meta is the only network with a platform dimension.
// ---------------------------------------------------------------------------

type MetaView = 'combined' | 'facebook' | 'instagram'

const META_VIEW_OPTIONS: readonly SegmentedOption<MetaView>[] = [
	{ value: 'combined', label: 'Combined' },
	{ value: 'facebook', label: 'Facebook' },
	{ value: 'instagram', label: 'Instagram' },
]

const META_VIEW_LABELS: Record<MetaView, string> = {
	combined: 'Combined',
	facebook: 'Facebook',
	instagram: 'Instagram',
}

const COMBINED_FOOTNOTE =
	'Combined view: rates recomputed from summed Facebook + Instagram bases (never averaged); ' +
	'reach excluded — the platforms’ audiences overlap; shares (Facebook-only) and saves ' +
	'(Instagram-only) appear in the platform views.'

/** LinkedIn extras.socialRow — secondary engagement KPI row */
const SOCIAL_KEYS: readonly MetricKey[] = ['likes', 'comments', 'shares', 'follows']

/** Every chart offers the base series; header rates join per network config */
const CHART_BASE_METRICS: readonly MetricKey[] = ['impressions', 'clicks', 'spend', 'conversions']

/** Rows for the rendered view, from ANY window's response (current or ghost). */
function viewRows(res: InsightsResponse, view: MetaView): ReadonlyArray<{ date: string }> {
	if (res.network !== 'meta') return res.dailyData
	if (view === 'facebook') return res.dailyData.facebook
	if (view === 'instagram') return res.dailyData.instagram
	// Combined = per-date join, summed bases, rates recomputed (combineMeta owns the policy)
	return combineMeta(res.dailyData)
}

/** Keep only finite numeric fields the registry knows — nulls (undefined rates) drop out. */
function toBag(source: object): MetricBag {
	const bag: Partial<Record<MetricKey, number>> = {}
	for (const [key, value] of Object.entries(source)) {
		if (typeof value === 'number' && Number.isFinite(value) && key in METRIC_REGISTRY) {
			bag[key as MetricKey] = value
		}
	}
	return bag
}

interface ViewModel {
	period: Period
	previousPeriod: Period
	rows: ReadonlyArray<{ date: string }>
	totalsBag: MetricBag
	prevTotalsBag: MetricBag
	csvScope: string
	csvPlatform: string
}

function buildView(res: InsightsResponse, metaView: MetaView): ViewModel {
	const base = { period: res.period, previousPeriod: res.previousPeriod }
	if (res.network === 'meta') {
		if (metaView === 'combined') {
			return {
				...base,
				rows: combineMeta(res.dailyData),
				totalsBag: toBag(combineMetaTotals(res.totals)),
				prevTotalsBag: toBag(combineMetaTotals(res.previousTotals)),
				csvScope: 'meta-combined',
				csvPlatform: 'combined',
			}
		}
		return {
			...base,
			rows: res.dailyData[metaView],
			totalsBag: toBag(res.totals[metaView]),
			prevTotalsBag: toBag(res.previousTotals[metaView]),
			csvScope: `meta-${metaView}`,
			csvPlatform: metaView,
		}
	}
	return {
		...base,
		rows: res.dailyData,
		totalsBag: toBag(res.totals),
		prevTotalsBag: toBag(res.previousTotals),
		csvScope: res.network,
		csvPlatform: res.network,
	}
}

// ---------------------------------------------------------------------------
// KPI header — every metric shows its delta (requirement #4), including the
// designed-neutral spend chip and the explicit "—" undefined state.
// ---------------------------------------------------------------------------

interface KpiVm {
	key: string
	label: string
	format: MetricFormat
	direction: MetricDirection
	value: number | null
	prev: number | null
}

/**
 * Prefer the API's own totals value when present (its rates are already
 * recomputed from summed bases); derive via the registry when the network
 * omits it — e.g. costPerConversion is native on Google only.
 */
function metricValue(key: MetricKey, bag: MetricBag): number | null {
	const native = bag[key]
	return typeof native === 'number' ? native : deriveRate(key, bag)
}

/** Fields BOTH meta platforms report (likes + comments) — shares is FB-only, saves IG-only. */
function engagementOf(bag: MetricBag): number | null {
	const likes = bag.likes
	const comments = bag.comments
	return typeof likes === 'number' && typeof comments === 'number' ? likes + comments : null
}

function kpiFor(key: string, totals: MetricBag, previous: MetricBag): KpiVm {
	if (key === 'engagement') {
		return {
			key,
			label: 'Engagement',
			format: 'compact',
			direction: 'up-good',
			value: engagementOf(totals),
			prev: engagementOf(previous),
		}
	}
	const metricKey = key as MetricKey
	const def = METRIC_REGISTRY[metricKey]
	return {
		key,
		label: def.label,
		format: def.format,
		direction: def.direction,
		value: metricValue(metricKey, totals),
		prev: metricValue(metricKey, previous),
	}
}

// ---------------------------------------------------------------------------

export default function NetworkPage() {
	const { networkId } = useParams()
	// Unknown network id -> the same designed 404 as the '*' route; never a crash
	if (!isNetworkId(networkId)) return <NotFoundPage />
	// key remounts detail state (chart metric, compare toggle) across networks
	return <NetworkDetail key={networkId} config={NETWORKS[networkId]} />
}

function NetworkDetail({ config }: { config: NetworkConfig }) {
	const theme = useTheme()
	const { start, end, setRange } = useDateRange()
	const state = useInsights(config.id, start, end)

	const [searchParams, setSearchParams] = useSearchParams()
	const rawPlatform = searchParams.get('platform')
	const metaView: MetaView =
		config.extras.platformToggle === true && (rawPlatform === 'facebook' || rawPlatform === 'instagram')
			? rawPlatform
			: 'combined'

	const setMetaView = useCallback(
		(view: MetaView) => {
			// replace: a view toggle canonicalizes in place — Back should return to
			// the previous PAGE, not replay every toggle click
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev)
					if (view === 'combined') next.delete('platform')
					else next.set('platform', view)
					return next
				},
				{ replace: true },
			)
		},
		[setSearchParams],
	)

	const data = state.status === 'success' ? state.data : null
	const view = useMemo(() => (data ? buildView(data, metaView) : null), [data, metaView])

	const kpis = useMemo(
		() => (view ? config.headerMetrics.map((key) => kpiFor(key, view.totalsBag, view.prevTotalsBag)) : []),
		[view, config],
	)
	const socialKpis = useMemo(
		() =>
			view && config.extras.socialRow === true
				? SOCIAL_KEYS.map((key) => kpiFor(key, view.totalsBag, view.prevTotalsBag))
				: [],
		[view, config],
	)

	const chartMetrics = useMemo<readonly MetricKey[]>(() => {
		const extras = config.headerMetrics.filter(
			(key): key is MetricKey =>
				key !== 'engagement' &&
				key in METRIC_REGISTRY &&
				!(CHART_BASE_METRICS as readonly string[]).includes(key),
		)
		return [...CHART_BASE_METRICS, ...extras]
	}, [config])

	// Ghost fetches reuse this on the previous window's response, so meta
	// Combined ghosts flow through the exact same combineMeta policy
	const selectRows = useCallback((res: InsightsResponse) => viewRows(res, metaView), [metaView])

	const csvRows = useMemo<CsvRow[]>(() => {
		if (!view) return []
		const section: CsvSection = {
			network: config.id,
			platform: view.csvPlatform,
			periodStart: view.period.startDate,
			periodEnd: view.period.endDate,
			rows: view.rows,
		}
		return buildCsvRows([section])
	}, [view, config.id])

	const hue =
		config.id === 'meta'
			? metaView === 'combined'
				? undefined
				: theme.platforms[metaView].base
			: theme.platforms[config.hues[0]].base

	const heading = config.id === 'meta' ? `Meta ${META_VIEW_LABELS[metaView]}` : config.label
	const windowDays = rangeLengthDays(start, end)

	return (
		<Page>
			<Header>
				<TitleBlock>
					<Title>{config.label}</Title>
					<Subtitle>
						{view
							? `${windowDays}-day window · ${formatRangeLabel(view.period)} · vs previous ${formatRangeLabel(view.previousPeriod)}`
							: `${windowDays}-day window · ${formatRangeLabel({ startDate: start, endDate: end })}`}
					</Subtitle>
				</TitleBlock>
				<Controls>
					<DateRangePicker start={start} end={end} onApply={setRange} />
					{view && (
						<ExportButton
							rows={csvRows}
							filename={csvFilename(view.csvScope, view.period.startDate, view.period.endDate)}
						/>
					)}
				</Controls>
			</Header>

			{config.extras.platformToggle === true && (
				<div>
					<SegmentedControl
						options={META_VIEW_OPTIONS}
						value={metaView}
						onChange={setMetaView}
						ariaLabel="Meta platform view"
					/>
				</div>
			)}

			{state.status === 'loading' && <NetworkSkeleton config={config} />}
			{state.status === 'error' && <ErrorPanel error={state.error} onRetry={state.retry} />}
			{view && (
				<>
					<KpiGrid>
						{kpis.map((kpi) => (
							<KpiTile key={kpi.key} kpi={kpi} />
						))}
					</KpiGrid>
					{socialKpis.length > 0 && (
						<KpiGrid aria-label="Social engagement">
							{socialKpis.map((kpi) => (
								<KpiTile key={kpi.key} kpi={kpi} />
							))}
						</KpiGrid>
					)}
					<ChartCard>
						<TimeSeriesChart
							network={config.id}
							heading={heading}
							rows={view.rows}
							selectRows={selectRows}
							metricKeys={chartMetrics}
							period={view.period}
							previousPeriod={view.previousPeriod}
							hue={hue}
							weekendBands={config.extras.weekendBands}
							footnote={config.id === 'meta' && metaView === 'combined' ? COMBINED_FOOTNOTE : undefined}
						/>
						{config.extras.weekendBands === true && (
							<PatternChip>
								Near-zero weekends are expected — LinkedIn drops to ~7% of weekday volume
							</PatternChip>
						)}
					</ChartCard>
				</>
			)}
		</Page>
	)
}

function KpiTile({ kpi }: { kpi: KpiVm }) {
	return (
		<Tile>
			<TileLabel>{kpi.label}</TileLabel>
			<TileValue>{formatMetric(kpi.value, kpi.format)}</TileValue>
			<div>
				<DeltaBadge delta={computeDelta(kpi.value, kpi.prev)} direction={kpi.direction} />
			</div>
		</Tile>
	)
}

// ---------------------------------------------------------------------------

/* Gap mirrors NetworkSkeleton's Stack — no layout shift when data lands */
const Page = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(6)};
	min-width: 0;
`

const Header = styled.header`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: ${({ theme }) => theme.space(4)};
`

const TitleBlock = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(1)};
	min-width: 0;
`

const Title = styled.h1`
	font-size: 24px;
	letter-spacing: -0.01em;
`

const Subtitle = styled.p`
	font-size: 13px;
	color: ${({ theme }) => theme.colors.inkMuted};
	font-variant-numeric: tabular-nums;
`

const Controls = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: ${({ theme }) => theme.space(3)};
	min-width: 0;
`

const Tile = styled(Card)`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(2)};
`

const TileLabel = styled.span`
	font-size: 12px;
	font-weight: 700;
	color: ${({ theme }) => theme.colors.inkMuted};
	text-transform: uppercase;
	letter-spacing: 0.04em;
`

const TileValue = styled.span`
	font-size: 26px;
	font-weight: 800;
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
	color: ${({ theme }) => theme.colors.ink};
`

const ChartCard = styled(Card)`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};
`

const PatternChip = styled.p`
	align-self: flex-start;
	padding: ${({ theme }) => `${theme.space(1)} ${theme.space(3)}`};
	border-radius: ${({ theme }) => theme.radii.pill};
	background: ${({ theme }) => theme.colors.fill};
	color: ${({ theme }) => theme.colors.inkMuted};
	font-size: 12px;
	font-weight: 600;
`
