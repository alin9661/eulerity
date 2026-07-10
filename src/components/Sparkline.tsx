import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import styled from 'styled-components'

const HEIGHT = 48

const ChartBox = styled.div`
	height: ${HEIGHT}px;
	min-width: 0;
`

const SrOnly = styled.span`
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
	border: 0;
`

export interface SparklinePoint {
	date: string
	value: number
}

export interface SparklineProps {
	data: ReadonlyArray<SparklinePoint>
	/** Stroke/gradient hue — a theme platform `base` or the brand accent */
	color: string
	/** Text alternative for the aria-hidden SVG */
	srText?: string
}

/**
 * Decorative trend glyph: no axes, no tooltip — the KPI rows beside it carry
 * the numbers, so the SVG is aria-hidden with an sr-only text alternative.
 */
export function Sparkline({ data, color, srText = '30-day spend trend' }: SparklineProps) {
	// useId emits ':'-delimited ids; strip them so url(#…) stays a valid SVG reference
	const gradientId = `spark-${useId().replace(/:/g, '')}`
	return (
		<>
			<SrOnly>{srText}</SrOnly>
			<ChartBox aria-hidden="true">
				<ResponsiveContainer width="100%" height={HEIGHT}>
					<AreaChart data={[...data]} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={color} stopOpacity={0.28} />
								<stop offset="100%" stopColor={color} stopOpacity={0.02} />
							</linearGradient>
						</defs>
						<Area
							type="monotone"
							dataKey="value"
							stroke={color}
							strokeWidth={2}
							fill={`url(#${gradientId})`}
							dot={false}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</ChartBox>
		</>
	)
}
