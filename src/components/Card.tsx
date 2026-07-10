import styled from 'styled-components'

/** White surface primitive — all dashboard/detail widgets sit on this */
export const Card = styled.div`
	background: ${({ theme }) => theme.colors.surface};
	border: 1px solid ${({ theme }) => theme.colors.border};
	border-radius: ${({ theme }) => theme.radii.lg};
	box-shadow: ${({ theme }) => theme.shadows.soft};
	padding: ${({ theme }) => theme.space(5)};
	min-width: 0;
`
