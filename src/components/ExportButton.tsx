import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { downloadCsv } from '../lib/csv'

const CONFIRM_MS = 2000

const Button = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 128px; /* "Export CSV" ⇄ "Exported ✓" swap must not shift layout */
	padding: ${({ theme }) => `${theme.space(2)} ${theme.space(4)}`};
	border: none;
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.gradient.accent};
	color: ${({ theme }) => theme.colors.surface};
	font-family: inherit;
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;

	&:hover:not(:disabled) {
		box-shadow: ${({ theme }) => theme.shadows.raised};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`

export interface ExportButtonProps {
	rows: Record<string, string | number>[]
	filename: string
	label?: string
}

export function ExportButton({ rows, filename, label = 'Export CSV' }: ExportButtonProps) {
	const [exported, setExported] = useState(false)
	const timerRef = useRef<number | undefined>(undefined)

	useEffect(() => () => window.clearTimeout(timerRef.current), [])

	const empty = rows.length === 0

	const handleClick = () => {
		downloadCsv(rows, filename)
		setExported(true)
		window.clearTimeout(timerRef.current)
		timerRef.current = window.setTimeout(() => setExported(false), CONFIRM_MS)
	}

	return (
		<Button
			type="button"
			onClick={handleClick}
			disabled={empty}
			title={empty ? 'Nothing to export — the current view has no rows' : undefined}
			aria-live="polite"
		>
			{exported ? 'Exported ✓' : label}
		</Button>
	)
}
