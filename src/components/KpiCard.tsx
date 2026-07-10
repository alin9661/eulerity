import styled from 'styled-components'
import type { Delta } from '../lib/deltas'
import type { MetricDirection } from '../lib/metrics'
import { Card } from './Card'
import { DeltaBadge } from './DeltaBadge'

// Fixed line-heights (16/34/22) — the loading skeleton reserves these exact
// boxes, so data swap-in causes zero reflow.
const Tile = styled(Card)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: ${({ theme }) => theme.space(2)};
`

const Label = styled.span`
	font-size: 11px;
	line-height: 16px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.colors.inkMuted};
`

const Value = styled.span`
	font-size: 26px;
	line-height: 34px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	color: ${({ theme }) => theme.colors.ink};
`

export interface KpiCardProps {
	label: string
	/** Preformatted via formatMetric — undefined states arrive as an em dash */
	value: string
	delta: Delta
	direction: MetricDirection
}

export function KpiCard({ label, value, delta, direction }: KpiCardProps) {
	return (
		<Tile>
			<Label>{label}</Label>
			<Value>{value}</Value>
			<DeltaBadge delta={delta} direction={direction} />
		</Tile>
	)
}
