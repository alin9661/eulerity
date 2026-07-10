import styled from 'styled-components'
import type { ApiError, ApiErrorCode } from '../api/client'
import { Card } from './Card'

interface ErrorCopy {
	title: string
	body: string
}

// Human copy per failure class. The server validation codes should be
// unreachable through the UI (the picker clamps windows to 7–30 days ending
// today) — they surface only via hand-edited URLs, so their copy points back
// at the range rather than apologizing for a bug.
const COPY: Record<ApiErrorCode, ErrorCopy> = {
	NETWORK: {
		title: 'Can’t reach the metrics API',
		body: 'The request never made it to the server. Check your connection — your data will load the moment it’s back.',
	},
	MALFORMED_RESPONSE: {
		title: 'The API sent something unreadable',
		body: 'The response didn’t match the shape this dashboard expects, so nothing was rendered rather than risk showing wrong numbers.',
	},
	MISSING_PARAM: {
		title: 'The API rejected this request',
		body: 'A required parameter was missing. If you edited the URL by hand, head back and pick a date range instead.',
	},
	INVALID_NETWORK: {
		title: 'The API rejected this request',
		body: 'That network isn’t one the API knows — only Meta, Google, and LinkedIn are available.',
	},
	INVALID_DATE_FORMAT: {
		title: 'The API rejected this request',
		body: 'Dates must be in YYYY-MM-DD format. If you edited the URL by hand, use the date picker instead.',
	},
	INVALID_DATE_RANGE: {
		title: 'The API rejected this request',
		body: 'The end date lands before the start date. Flip the range and try again.',
	},
	WINDOW_TOO_SMALL: {
		title: 'That window is too short',
		body: 'The API needs at least 7 days of data to compare periods. Widen the range and retry.',
	},
	WINDOW_TOO_LARGE: {
		title: 'That window is too long',
		body: 'The API caps windows at 30 days. Narrow the range and retry.',
	},
	NOT_FOUND: {
		title: 'The API has nothing at that address',
		body: 'The endpoint this request hit doesn’t exist. This usually means a hand-edited URL.',
	},
	METHOD_NOT_ALLOWED: {
		title: 'The API rejected this request',
		body: 'Only GET requests are supported by the metrics API.',
	},
}

const Panel = styled(Card)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: ${({ theme }) => theme.space(2)};
	max-width: 560px;
`

const Kicker = styled.p`
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.colors.delta.unfavorable.fg};
`

const Title = styled.h2`
	font-size: 18px;
	font-weight: 800;
	letter-spacing: -0.01em;
	color: ${({ theme }) => theme.colors.ink};
`

const Body = styled.p`
	font-size: 14px;
	line-height: 1.55;
	color: ${({ theme }) => theme.colors.inkMuted};
`

const Detail = styled.p`
	font-size: 12px;
	color: ${({ theme }) => theme.colors.inkMuted};
	padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
	border-radius: ${({ theme }) => theme.radii.sm};
	background: ${({ theme }) => theme.colors.fill};
`

const RetryButton = styled.button`
	margin-top: ${({ theme }) => theme.space(1)};
	padding: ${({ theme }) => `${theme.space(2)} ${theme.space(4)}`};
	border: 1px solid ${({ theme }) => theme.colors.border};
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.colors.surface};
	color: ${({ theme }) => theme.colors.ink};
	font-family: inherit;
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;

	&:hover {
		background: ${({ theme }) => theme.colors.fill};
	}
`

export interface ErrorPanelProps {
	error: ApiError
	onRetry: () => void
}

export function ErrorPanel({ error, onRetry }: ErrorPanelProps) {
	const copy = COPY[error.code]

	return (
		<Panel role="alert">
			<Kicker>Request failed · {error.code}</Kicker>
			<Title>{copy.title}</Title>
			<Body>{copy.body}</Body>
			<Detail>{error.message}</Detail>
			{/* Retry genuinely re-fetches: the snapshot cache evicts rejected
			    promises (api/cache.ts), so this click issues a fresh request
			    instead of replaying the cached failure. */}
			<RetryButton type="button" onClick={onRetry}>
				Retry
			</RetryButton>
		</Panel>
	)
}
