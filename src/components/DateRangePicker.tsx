import { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
	DEFAULT_WINDOW_DAYS,
	MAX_WINDOW_DAYS,
	MIN_WINDOW_DAYS,
	addDays,
	clampRange,
	diffDays,
	isValidISODate,
	rangeLengthDays,
	todayISO,
} from '../lib/dates'

export interface DateRangePickerProps {
	start: string
	end: string
	/** Receives the raw selection; useDateRange.setRange clamps and pushes */
	onApply: (start: string, end: string) => void
}

const PRESETS = [7, 14, 30] as const

/**
 * Explains what clampRange is about to do to an out-of-bounds selection, so
 * the silent correction (lib/dates rules) never reads as the picker ignoring
 * the user. Only called when the clamped result differs from the draft.
 */
function adjustmentNote(rawStart: string, rawEnd: string, today: string): string {
	const resetSuffix = `— reset to the default ${DEFAULT_WINDOW_DAYS}-day window.`
	if (!isValidISODate(rawStart) || !isValidISODate(rawEnd)) {
		return `Dates must be valid calendar days ${resetSuffix}`
	}
	if (diffDays(rawStart, rawEnd) < 0) {
		return `End date was before the start date ${resetSuffix}`
	}
	const futureEnd = diffDays(today, rawEnd) > 0
	const effectiveEnd = futureEnd ? today : rawEnd
	if (diffDays(rawStart, effectiveEnd) < 0) {
		return `That window is entirely in the future ${resetSuffix}`
	}
	if (rangeLengthDays(rawStart, effectiveEnd) < MIN_WINDOW_DAYS) {
		return `Windows need at least ${MIN_WINDOW_DAYS} days${futureEnd ? ' after clamping to today' : ''} ${resetSuffix}`
	}
	if (rangeLengthDays(rawStart, effectiveEnd) > MAX_WINDOW_DAYS) {
		return `Windows are capped at ${MAX_WINDOW_DAYS} days — start date moved forward${futureEnd ? '; end clamped to today' : ''}.`
	}
	// Only remaining adjustment: a future end date (the API fabricates future data)
	return 'End date clamped to today — future data is not available.'
}

export function DateRangePicker({ start, end, onApply }: DateRangePickerProps) {
	const [draftStart, setDraftStart] = useState(start)
	const [draftEnd, setDraftEnd] = useState(end)
	const [note, setNote] = useState<string | null>(null)

	// Applied range changed (Apply, preset, Back/Forward, URL edit) — resync drafts
	useEffect(() => {
		setDraftStart(start)
		setDraftEnd(end)
	}, [start, end])

	const today = todayISO()

	const presetRange = (days: number) => ({ start: addDays(today, -(days - 1)), end: today })
	const isPresetActive = (days: number) => {
		const range = presetRange(days)
		return start === range.start && end === range.end
	}

	const applyPreset = (days: number) => {
		const range = presetRange(days)
		setNote(null)
		onApply(range.start, range.end)
	}

	const handleApply = () => {
		const clamped = clampRange(draftStart, draftEnd, today)
		const adjusted = clamped.start !== draftStart || clamped.end !== draftEnd
		setNote(adjusted ? adjustmentNote(draftStart, draftEnd, today) : null)
		onApply(draftStart, draftEnd)
	}

	return (
		<Wrap role="group" aria-label="Date range">
			<Presets>
				{PRESETS.map((days) => (
					<PresetChip
						key={days}
						type="button"
						$active={isPresetActive(days)}
						aria-pressed={isPresetActive(days)}
						onClick={() => applyPreset(days)}
					>
						{days}d
					</PresetChip>
				))}
			</Presets>
			<Custom>
				<DateInput
					type="date"
					aria-label="Start date"
					value={draftStart}
					max={today}
					onChange={(event) => setDraftStart(event.target.value)}
				/>
				<Dash aria-hidden="true">–</Dash>
				<DateInput
					type="date"
					aria-label="End date"
					value={draftEnd}
					max={today}
					onChange={(event) => setDraftEnd(event.target.value)}
				/>
				<ApplyButton type="button" onClick={handleApply}>
					Apply
				</ApplyButton>
			</Custom>
			{/* Live region stays mounted so note changes always announce */}
			<Note role="status">{note}</Note>
		</Wrap>
	)
}

/* flex-wrap lets the custom-range row drop under the presets below 640px
   without any breakpoint bookkeeping */
const Wrap = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
	min-width: 0;
`

/* Mirrors the SegmentedControl track so the two control families read as one system */
const Presets = styled.div`
	display: inline-flex;
	gap: ${({ theme }) => theme.space(1)};
	padding: ${({ theme }) => theme.space(1)};
	background: ${({ theme }) => theme.colors.fill};
	border-radius: ${({ theme }) => theme.radii.md};
`

const PresetChip = styled.button<{ $active: boolean }>`
	padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3)}`};
	border-radius: ${({ theme }) => theme.radii.sm};
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	color: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.inkMuted)};
	background: ${({ theme, $active }) => ($active ? theme.gradient.accent : 'transparent')};
	box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.soft : 'none')};
	transition: color 120ms ease;

	&:hover {
		color: ${({ theme, $active }) => ($active ? theme.colors.surface : theme.colors.ink)};
	}
`

const Custom = styled.div`
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: ${({ theme }) => theme.space(2)};
`

const DateInput = styled.input`
	padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(2.5)}`};
	border: 1px solid ${({ theme }) => theme.colors.border};
	border-radius: ${({ theme }) => theme.radii.sm};
	background: ${({ theme }) => theme.colors.surface};
	color: ${({ theme }) => theme.colors.ink};
	font-size: 13px;
	font-variant-numeric: tabular-nums;

	&::-webkit-calendar-picker-indicator {
		cursor: pointer;
	}
`

const Dash = styled.span`
	color: ${({ theme }) => theme.colors.inkMuted};
`

const ApplyButton = styled.button`
	padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(4)}`};
	border-radius: ${({ theme }) => theme.radii.sm};
	background: ${({ theme }) => theme.gradient.accent};
	color: ${({ theme }) => theme.colors.surface};
	font-size: 13px;
	font-weight: 700;
`

const Note = styled.p`
	flex-basis: 100%;
	font-size: 12px;
	color: ${({ theme }) => theme.colors.inkMuted};
`
