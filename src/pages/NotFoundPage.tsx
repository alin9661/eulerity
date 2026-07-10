import { Link } from 'react-router-dom'
import styled from 'styled-components'

const Wrap = styled.section`
	min-height: 60vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	gap: ${({ theme }) => theme.space(3)};
	padding: ${({ theme }) => theme.space(6)};
`

const Numeral = styled.p`
	font-size: 72px;
	font-weight: 800;
	letter-spacing: -0.04em;
	line-height: 1;
	font-variant-numeric: tabular-nums;
	background: ${({ theme }) => theme.gradient.accent};
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	color: transparent;
`

const Title = styled.h1`
	font-size: 22px;
	font-weight: 800;
	letter-spacing: -0.01em;
	color: ${({ theme }) => theme.colors.ink};
`

const Body = styled.p`
	max-width: 440px;
	font-size: 14px;
	line-height: 1.55;
	color: ${({ theme }) => theme.colors.inkMuted};
`

const BackLink = styled(Link)`
	margin-top: ${({ theme }) => theme.space(2)};
	display: inline-flex;
	align-items: center;
	padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(5)}`};
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.gradient.accent};
	color: ${({ theme }) => theme.colors.surface};
	font-size: 13px;
	font-weight: 700;

	&:hover {
		box-shadow: ${({ theme }) => theme.shadows.raised};
	}
`

export default function NotFoundPage() {
	return (
		<Wrap>
			<Numeral aria-hidden="true">404</Numeral>
			<Title>This channel isn’t on the dashboard</Title>
			<Body>
				Meta, Google, and LinkedIn are the only networks reporting in. Whatever this address once pointed to, there are
				no metrics behind it — double-check the URL or head back to the overview.
			</Body>
			<BackLink to="/">Back to overview</BackLink>
		</Wrap>
	)
}
