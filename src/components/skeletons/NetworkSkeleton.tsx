import styled, { keyframes } from 'styled-components'
import type { NetworkConfig } from '../../networks'
import { Card } from '../Card'

/**
 * Shared with NetworkPage (which imports it) so the skeleton mirrors the real
 * KPI layout by construction rather than by copy-paste drift.
 */
export const KpiGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: ${({ theme }) => theme.space(4)};
	min-width: 0;
`

const pulse = keyframes`
	0%, 100% { opacity: 0.55; }
	50% { opacity: 1; }
`

const Bone = styled.span<{ $w: string; $h: string; $pill?: boolean }>`
	display: block;
	width: ${({ $w }) => $w};
	max-width: 100%;
	height: ${({ $h }) => $h};
	border-radius: ${({ theme, $pill }) => ($pill ? theme.radii.pill : theme.radii.sm)};
	background: ${({ theme }) => theme.colors.fill};
	animation: ${pulse} 1.6s ease-in-out infinite;
`

/* Gaps mirror NetworkPage's content stack exactly — no layout shift on load */
const Stack = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(6)};
	min-width: 0;
`

const TileInner = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(2)};
`

const ChartInner = styled.div`
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};
`

const ToolbarRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: ${({ theme }) => theme.space(3)};
`

const SOCIAL_TILE_COUNT = 4

function KpiTileBone() {
	return (
		<Card>
			<TileInner>
				<Bone $w="90px" $h="12px" />
				<Bone $w="130px" $h="28px" />
				<Bone $w="64px" $h="21px" $pill />
			</TileInner>
		</Card>
	)
}

export function NetworkSkeleton({ config }: { config: NetworkConfig }) {
	return (
		<div role="status" aria-label={`Loading ${config.label} insights`}>
			<Stack aria-hidden="true">
				<KpiGrid>
					{config.headerMetrics.map((key) => (
						<KpiTileBone key={key} />
					))}
				</KpiGrid>
				{config.extras.socialRow === true && (
					<KpiGrid>
						{Array.from({ length: SOCIAL_TILE_COUNT }, (_, index) => (
							<KpiTileBone key={index} />
						))}
					</KpiGrid>
				)}
				<Card>
					<ChartInner>
						<ToolbarRow>
							<Bone $w="320px" $h="38px" />
							<Bone $w="180px" $h="18px" />
						</ToolbarRow>
						<Bone $w="100%" $h="300px" />
						<Bone $w="240px" $h="14px" />
					</ChartInner>
				</Card>
			</Stack>
		</div>
	)
}
