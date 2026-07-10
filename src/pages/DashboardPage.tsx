import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import type { Period, SummaryChannel, SummaryResponse, SummaryTotals } from '../api/types'
import { Card } from '../components/Card'
import { DeltaBadge } from '../components/DeltaBadge'
import { ErrorPanel } from '../components/ErrorPanel'
import { ExportButton } from '../components/ExportButton'
import { KpiCard } from '../components/KpiCard'
import { Sparkline } from '../components/Sparkline'
import {
	Bone,
	DashboardSkeleton,
	KpiGrid,
	WidgetGrid,
} from '../components/skeletons/DashboardSkeleton'
import { useSummary } from '../hooks/useQuery'
import { buildCsvRows, csvFilename } from '../lib/csv'
import { parseISO } from '../lib/dates'
import { computeDelta } from '../lib/deltas'
import { METRIC_REGISTRY, deriveRate, formatMetric } from '../lib/metrics'
import type { MetricKey } from '../lib/metrics'
import type { PlatformKey } from '../theme'

interface WidgetConfig {
	key: PlatformKey
	name: string
	/** CSV context column — facebook/instagram both belong to the meta network */
	network: string
	to: string
	pick: (summary: SummaryResponse) => SummaryChannel
	note?: string
}

// FB and IG are separate widgets but share the /network/meta detail page,
// which reads ?platform= to preselect its segmented control.
const WIDGETS: readonly WidgetConfig[] = [
	{
		key: 'facebook',
		name: 'Facebook',
		network: 'meta',
		to: '/network/meta?platform=facebook',
		pick: (s) => s.meta.facebook,
	},
	{
		key: 'instagram',
		name: 'Instagram',
		network: 'meta',
		to: '/network/meta?platform=instagram',
		pick: (s) => s.meta.instagram,
	},
	{ key: 'google', name: 'Google', network: 'google', to: '/network/google', pick: (s) => s.google },
	{
		key: 'linkedin',
		name: 'LinkedIn',
		network: 'linkedin',
		to: '/network/linkedin',
		pick: (s) => s.linkedin,
		// Intentional data pattern (~7% of weekday volume), not a bug — per spec
		note: 'Near-zero weekends are expected',
	},
]

/** All-channel strip: spend is designed-neutral; CTR is derived (summary is base-only). */
const STRIP_KEYS: readonly MetricKey[] = ['spend', 'conversions', 'impressions', 'ctr']

const WIDGET_KPI_KEYS: readonly MetricKey[] = ['spend', 'conversions', 'ctr']

const BASE_KEYS = ['impressions', 'clicks', 'spend', 'conversions'] as const

function sumTotals(
	channels: readonly SummaryChannel[],
	which: 'totals' | 'previousTotals',
): SummaryTotals {
	const out: SummaryTotals = { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
	for (const channel of channels) {
		for (const key of BASE_KEYS) out[key] += channel[which][key]
	}
	return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayLabel(iso: string, withYear: boolean): string {
	const { y, m, d } = parseISO(iso)
	const base = `${MONTHS[m - 1]} ${d}`
	return withYear ? `${base}, ${y}` : base
}

/** Window label straight from the response's period bounds (year only shown across a boundary). */
function periodLabel(period: Period): string {
	const withYear = parseISO(period.startDate).y !== parseISO(period.endDate).y
	return `${dayLabel(period.startDate, withYear)} – ${dayLabel(period.endDate, withYear)}`
}

const Stack = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(5)};
`

const Header = styled.header`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: ${({ theme }) => theme.space(3)};
`

const Title = styled.h1`
	font-size: 24px;
	letter-spacing: -0.01em;
`

const Subtitle = styled.p`
	margin-top: ${({ theme }) => theme.space(1)};
	font-size: 13px;
	line-height: 20px;
	color: ${({ theme }) => theme.colors.inkMuted};
	font-variant-numeric: tabular-nums;
`

const WidgetCard = styled(Card)<{ $hue: PlatformKey }>`
	border-top: 3px solid ${({ theme, $hue }) => theme.platforms[$hue].base};
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};
	transition:
		box-shadow 0.15s ease,
		transform 0.15s ease;

	&:hover {
		box-shadow: ${({ theme }) => theme.shadows.raised};
		transform: translateY(-1px);
	}
`

const Head = styled.div`
	display: flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
`

const Dot = styled.span<{ $hue: PlatformKey }>`
	width: 8px;
	height: 8px;
	border-radius: ${({ theme }) => theme.radii.pill};
	background: ${({ theme, $hue }) => theme.platforms[$hue].base};
	flex-shrink: 0;
`

const Name = styled.h2`
	font-size: 14px;
	line-height: 20px;
	font-weight: 800;
	color: ${({ theme }) => theme.colors.ink};
`

const Rows = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(2)};
`

const Row = styled.div`
	display: grid;
	grid-template-columns: 1fr auto auto;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
	min-height: 22px;
`

const RowLabel = styled.span`
	font-size: 12px;
	font-weight: 600;
	color: ${({ theme }) => theme.colors.inkMuted};
`

const RowValue = styled.span`
	font-size: 14px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	color: ${({ theme }) => theme.colors.ink};
`

const Foot = styled.div`
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: ${({ theme }) => theme.space(2)};
	font-size: 12px;
	line-height: 18px;
`

const FootNote = styled.span`
	color: ${({ theme }) => theme.colors.inkMuted};
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const FootCta = styled.span<{ $hue: PlatformKey }>`
	font-weight: 700;
	white-space: nowrap;
	color: ${({ theme, $hue }) => theme.platforms[$hue].text};
`

function PlatformWidget({ config, channel }: { config: WidgetConfig; channel: SummaryChannel }) {
	const theme = useTheme()
	const hue = theme.platforms[config.key]
	const spark = channel.dailyData.map((day) => ({ date: day.date, value: day.spend }))
	return (
		<WidgetCard as={Link} to={config.to} $hue={config.key}>
			<Head>
				<Dot $hue={config.key} aria-hidden="true" />
				<Name>{config.name}</Name>
			</Head>
			<Rows>
				{WIDGET_KPI_KEYS.map((key) => {
					const def = METRIC_REGISTRY[key]
					// Summary totals are BASE-only: rates derived from bases for BOTH
					// periods, then delta'd — never delta'd on one derived side.
					const current = deriveRate(key, channel.totals)
					const previous = deriveRate(key, channel.previousTotals)
					return (
						<Row key={key}>
							<RowLabel>{def.label}</RowLabel>
							<RowValue>{formatMetric(current, def.format)}</RowValue>
							<DeltaBadge delta={computeDelta(current, previous)} direction={def.direction} />
						</Row>
					)
				})}
			</Rows>
			<Sparkline data={spark} color={hue.base} srText={`${config.name} 30-day spend trend`} />
			<Foot>
				<FootNote>{config.note ?? 'Last 30 days'}</FootNote>
				<FootCta $hue={config.key}>View details →</FootCta>
			</Foot>
		</WidgetCard>
	)
}

function SummaryBody({ data }: { data: SummaryResponse }) {
	const channels = WIDGETS.map((widget) => widget.pick(data))
	const totals = sumTotals(channels, 'totals')
	const previousTotals = sumTotals(channels, 'previousTotals')
	return (
		<>
			<KpiGrid>
				{STRIP_KEYS.map((key) => {
					const def = METRIC_REGISTRY[key]
					const current = deriveRate(key, totals)
					const previous = deriveRate(key, previousTotals)
					return (
						<KpiCard
							key={key}
							label={def.label}
							value={formatMetric(current, def.format)}
							delta={computeDelta(current, previous)}
							direction={def.direction}
						/>
					)
				})}
			</KpiGrid>
			<WidgetGrid>
				{WIDGETS.map((widget) => (
					<PlatformWidget key={widget.key} config={widget} channel={widget.pick(data)} />
				))}
			</WidgetGrid>
		</>
	)
}

export default function DashboardPage() {
	const state = useSummary()
	const data = state.status === 'success' ? state.data : null

	// Same uniform daily-grain CSV contract as the detail pages — one section
	// per platform over the summary's own 30d window.
	const csvRows = useMemo(() => {
		if (!data) return []
		return buildCsvRows(
			WIDGETS.map((widget) => ({
				network: widget.network,
				platform: widget.key,
				periodStart: data.period.startDate,
				periodEnd: data.period.endDate,
				rows: widget.pick(data).dailyData,
			})),
		)
	}, [data])

	return (
		<Stack>
			<Header>
				<div>
					<Title>Overview</Title>
					{data ? (
						<Subtitle>
							{periodLabel(data.period)} vs {periodLabel(data.previousPeriod)} · all channels,
							fixed 30-day window
						</Subtitle>
					) : state.status === 'loading' ? (
						<Subtitle as="div">
							<Bone $w="280px" $h="20px" />
						</Subtitle>
					) : (
						<Subtitle>Summary unavailable</Subtitle>
					)}
				</div>
				{data ? (
					<ExportButton
						rows={csvRows}
						filename={csvFilename('dashboard', data.period.startDate, data.period.endDate)}
					/>
				) : state.status === 'loading' ? (
					<Bone $w="132px" $h="36px" />
				) : null}
			</Header>

			{state.status === 'loading' && <DashboardSkeleton />}
			{state.status === 'error' && <ErrorPanel error={state.error} onRetry={state.retry} />}
			{data && <SummaryBody data={data} />}
		</Stack>
	)
}
