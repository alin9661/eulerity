import styled from 'styled-components'
import { formatMetric } from '../lib/metrics'
import type { MetricFormat } from '../lib/metrics'

export interface ChartTablePoint {
	date: string
	value: number | null
	prevDate?: string | null
	prevValue?: number | null
}

export interface ChartDataTableProps {
	caption: string
	metricLabel: string
	format: MetricFormat
	points: ReadonlyArray<ChartTablePoint>
	/** Column header for ghost values; omit for a two-column table */
	previousLabel?: string
}

/* Visually-hidden (clip pattern, not display:none — must stay in the a11y
   tree): an SVG chart is a screen-reader dead zone, so this table IS the
   chart for non-visual users. */
const SrTable = styled.table`
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
`

export function ChartDataTable({ caption, metricLabel, format, points, previousLabel }: ChartDataTableProps) {
	const withPrevious = previousLabel !== undefined
	return (
		<SrTable>
			<caption>{caption}</caption>
			<thead>
				<tr>
					<th scope="col">Date</th>
					<th scope="col">{metricLabel}</th>
					{withPrevious && <th scope="col">{previousLabel}</th>}
				</tr>
			</thead>
			<tbody>
				{points.map((point) => (
					<tr key={point.date}>
						<th scope="row">{point.date}</th>
						<td>{formatMetric(point.value, format)}</td>
						{withPrevious && <td>{formatMetric(point.prevValue ?? null, format)}</td>}
					</tr>
				))}
			</tbody>
		</SrTable>
	)
}
