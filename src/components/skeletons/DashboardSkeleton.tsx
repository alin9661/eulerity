import styled, { keyframes } from 'styled-components'
import { Card } from '../Card'

/**
 * The dashboard's layout primitives live HERE and are imported by
 * DashboardPage, so the skeleton mirrors the real grid BY CONSTRUCTION —
 * loading → data swaps content inside identical tracks with zero reflow.
 */
export const KpiGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	gap: ${({ theme }) => theme.space(4)};

	@media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
		grid-template-columns: repeat(2, 1fr);
	}

	@media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
		grid-template-columns: repeat(4, 1fr);
	}
`

export const WidgetGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	gap: ${({ theme }) => theme.space(4)};

	@media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
		grid-template-columns: repeat(2, 1fr);
	}
`

const pulse = keyframes`
	0%, 100% { opacity: 1; }
	50% { opacity: 0.55; }
`

/** Neutral shimmer block; the page header reuses it for its subtitle/button slots. */
export const Bone = styled.div<{ $w?: string; $h: string }>`
	width: ${({ $w }) => $w ?? '100%'};
	max-width: 100%;
	height: ${({ $h }) => $h};
	border-radius: ${({ theme }) => theme.radii.sm};
	background: ${({ theme }) => theme.colors.fill};
	animation: ${pulse} 1.6s ease-in-out infinite;
`

const Wrap = styled.div`
	/* Same stack gap as the page body so swap-in shifts nothing */
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(5)};
`

const TileStack = styled(Card)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: ${({ theme }) => theme.space(2)};
`

const WidgetStack = styled(Card)`
	border-top: 3px solid ${({ theme }) => theme.colors.fill};
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};
`

const RowStack = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(2)};
`

// Bone heights mirror the real line boxes: KpiCard label 16 / value 34 /
// badge 22; widget head 20 / rows 22 / sparkline 48 / foot 18.
function SkeletonKpi() {
	return (
		<TileStack>
			<Bone $w="55%" $h="16px" />
			<Bone $w="70%" $h="34px" />
			<Bone $w="72px" $h="22px" />
		</TileStack>
	)
}

function SkeletonWidget() {
	return (
		<WidgetStack>
			<Bone $w="40%" $h="20px" />
			<RowStack>
				<Bone $h="22px" />
				<Bone $h="22px" />
				<Bone $h="22px" />
			</RowStack>
			<Bone $h="48px" />
			<Bone $w="60%" $h="18px" />
		</WidgetStack>
	)
}

const TILE_KEYS = ['a', 'b', 'c', 'd'] as const

export function DashboardSkeleton() {
	return (
		<Wrap role="status" aria-label="Loading dashboard">
			<KpiGrid>
				{TILE_KEYS.map((k) => (
					<SkeletonKpi key={k} />
				))}
			</KpiGrid>
			<WidgetGrid>
				{TILE_KEYS.map((k) => (
					<SkeletonWidget key={k} />
				))}
			</WidgetGrid>
		</Wrap>
	)
}
