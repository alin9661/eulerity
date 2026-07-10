import { NavLink, useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { NETWORK_LIST } from '../networks'
import type { NetworkConfig } from '../networks'

const Aside = styled.aside`
	background: ${({ theme }) => theme.colors.surface};
	border-bottom: 1px solid ${({ theme }) => theme.colors.border};
	padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
	display: flex;
	flex-direction: column;
	gap: ${({ theme }) => theme.space(3)};

	@media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
		width: 232px;
		flex: none;
		border-bottom: none;
		border-right: 1px solid ${({ theme }) => theme.colors.border};
		padding: ${({ theme }) => `${theme.space(6)} ${theme.space(4)}`};
		gap: ${({ theme }) => theme.space(8)};
		position: sticky;
		top: 0;
		align-self: flex-start;
		height: 100dvh;
	}
`

const Brand = styled(NavLink)`
	display: flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(2.5)};
	font-size: 16px;
	font-weight: 800;
	letter-spacing: -0.01em;
`

const BrandMark = styled.span`
	width: 28px;
	height: 28px;
	flex: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: ${({ theme }) => theme.radii.sm};
	background: ${({ theme }) => theme.gradient.accent};
	color: ${({ theme }) => theme.colors.surface};
	font-size: 15px;
	font-weight: 800;
`

/* Wraps onto a second row on narrow screens instead of scrolling horizontally */
const Nav = styled.nav`
	display: flex;
	flex-wrap: wrap;
	gap: ${({ theme }) => theme.space(1)};

	@media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
		flex-direction: column;
		flex-wrap: nowrap;
	}
`

const Dot = styled.span<{ $bg: string }>`
	width: 8px;
	height: 8px;
	flex: none;
	border-radius: ${({ theme }) => theme.radii.pill};
	background: ${({ $bg }) => $bg};
`

const Item = styled(NavLink)`
	display: flex;
	align-items: center;
	gap: ${({ theme }) => theme.space(2.5)};
	padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
	border-radius: ${({ theme }) => theme.radii.md};
	font-size: 14px;
	font-weight: 600;
	color: ${({ theme }) => theme.colors.inkMuted};

	&:hover {
		background: ${({ theme }) => theme.colors.fill};
		color: ${({ theme }) => theme.colors.ink};
	}

	&.active {
		background: ${({ theme }) => theme.gradient.accent};
		color: ${({ theme }) => theme.colors.surface};
	}

	&.active ${Dot} {
		background: rgba(255, 255, 255, 0.9);
	}
`

/**
 * Network links carry ONLY the current ?start&end forward (comparing channels
 * over a hand-picked window is the core workflow) — never view-local params
 * like ?platform, which would leak a stale Meta selection onto other networks.
 * The meta link keeps platform so hopping away and back preserves the view.
 */
function carriedSearch(search: string, networkId: string): string {
	const current = new URLSearchParams(search)
	const next = new URLSearchParams()
	for (const key of ['start', 'end']) {
		const value = current.get(key)
		if (value !== null) next.set(key, value)
	}
	if (networkId === 'meta') {
		const platform = current.get('platform')
		if (platform !== null) next.set('platform', platform)
	}
	const out = next.toString()
	return out === '' ? '' : `?${out}`
}

function networkHue(
	network: NetworkConfig,
	platforms: Record<string, { base: string }>,
): string {
	const bases = network.hues.map((hue) => platforms[hue]?.base ?? 'currentColor')
	// Meta: split dot — half Facebook blue, half Instagram magenta
	return bases.length === 1
		? (bases[0] as string)
		: `linear-gradient(135deg, ${bases[0]} 50%, ${bases[1]} 50%)`
}

export function Sidebar() {
	const theme = useTheme()
	// The dashboard link drops the query — the summary endpoint is a fixed
	// 30-day window and ?start&end would be meaningless there.
	const { search } = useLocation()

	return (
		<Aside>
			<Brand to="/" aria-label="Eulerity Metrics — home">
				<BrandMark aria-hidden="true">E</BrandMark>
				<span>Eulerity Metrics</span>
			</Brand>
			<Nav aria-label="Primary">
				<Item to="/" end>
					<Dot $bg={theme.gradient.accent} aria-hidden="true" />
					Dashboard
				</Item>
				{NETWORK_LIST.map((network) => (
					<Item
						key={network.id}
						to={{ pathname: `/network/${network.id}`, search: carriedSearch(search, network.id) }}
					>
						<Dot $bg={networkHue(network, theme.platforms)} aria-hidden="true" />
						{network.label}
					</Item>
				))}
			</Nav>
		</Aside>
	)
}
