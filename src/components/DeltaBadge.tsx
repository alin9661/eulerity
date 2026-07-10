import styled from 'styled-components'
import type { Delta } from '../lib/deltas'
import type { MetricDirection } from '../lib/metrics'

type Tone = 'favorable' | 'unfavorable' | 'neutral'

const ARROW_GLYPH = { up: '▲', down: '▼', flat: '→' } as const

// Spend is designed-neutral (PLAN ambiguity #1): a direction arrow with no
// favorability color, because spend up can be scale or waste.
const NEUTRAL_TOOLTIP =
	'Spend carries no valence — judge efficiency via cost per conversion'

function toneFor(arrow: 'up' | 'down' | 'flat', direction: MetricDirection): Tone {
	if (direction === 'neutral' || arrow === 'flat') return 'neutral'
	const up = arrow === 'up'
	return up === (direction === 'up-good') ? 'favorable' : 'unfavorable'
}

const Chip = styled.span<{ $tone: Tone }>`
	display: inline-flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(1)};
	padding: ${({ theme }) => `${theme.space(0.5)} ${theme.space(2)}`};
	border-radius: ${({ theme }) => theme.radii.pill};
	font-size: 12px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	color: ${({ theme, $tone }) => theme.colors.delta[$tone].fg};
	background: ${({ theme, $tone }) => theme.colors.delta[$tone].bg};
`

const Arrow = styled.span`
	font-size: 9px;
	line-height: 1;
`

export interface DeltaBadgeProps {
	delta: Delta
	direction: MetricDirection
}

export function DeltaBadge({ delta, direction }: DeltaBadgeProps) {
	if (delta.kind === 'undefined') {
		return (
			<Chip $tone="neutral" aria-label="no comparison available">
				<span aria-hidden="true">—</span>
			</Chip>
		)
	}

	const tone = toneFor(delta.arrow, direction)
	const pctText = `${Math.abs(delta.pct).toFixed(1)}%`
	const motion =
		delta.arrow === 'flat' ? 'unchanged' : `${delta.arrow} ${Math.abs(delta.pct).toFixed(1)} percent`
	const verdict =
		tone === 'neutral' ? (direction === 'neutral' ? 'neutral' : '') : tone
	const ariaLabel = verdict ? `${motion}, ${verdict}` : motion

	return (
		<Chip
			$tone={tone}
			aria-label={ariaLabel}
			title={direction === 'neutral' ? NEUTRAL_TOOLTIP : undefined}
		>
			<Arrow aria-hidden="true">{ARROW_GLYPH[delta.arrow]}</Arrow>
			<span aria-hidden="true">{pctText}</span>
		</Chip>
	)
}
