import { useRef } from 'react'
import styled from 'styled-components'

export interface SegmentedOption<T extends string = string> {
	value: T
	label: string
}

export interface SegmentedControlProps<T extends string = string> {
	options: readonly SegmentedOption<T>[]
	value: T
	onChange: (value: T) => void
	ariaLabel: string
}

const Track = styled.div`
	display: inline-flex;
	gap: ${({ theme }) => theme.space(1)};
	padding: ${({ theme }) => theme.space(1)};
	background: ${({ theme }) => theme.colors.fill};
	border-radius: ${({ theme }) => theme.radii.md};
	max-width: 100%;
	overflow-x: auto;
`

const Segment = styled.button<{ $active: boolean }>`
	padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3)}`};
	border-radius: ${({ theme }) => theme.radii.sm};
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	color: ${({ theme, $active }) => ($active ? theme.colors.ink : theme.colors.inkMuted)};
	background: ${({ theme, $active }) => ($active ? theme.colors.surface : 'transparent')};
	box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.soft : 'none')};
	transition: background 120ms ease, color 120ms ease;

	&:hover {
		color: ${({ theme }) => theme.colors.ink};
	}
`

export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	ariaLabel,
}: SegmentedControlProps<T>) {
	const refs = useRef<(HTMLButtonElement | null)[]>([])

	// Roving tabindex: arrows move focus AND selection (native radio behavior)
	const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
		let next: number
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				next = (index + 1) % options.length
				break
			case 'ArrowLeft':
			case 'ArrowUp':
				next = (index - 1 + options.length) % options.length
				break
			case 'Home':
				next = 0
				break
			case 'End':
				next = options.length - 1
				break
			default:
				return
		}
		event.preventDefault()
		const option = options[next]
		if (option) {
			onChange(option.value)
			refs.current[next]?.focus()
		}
	}

	// Roving-tabindex anchor falls back to the first segment so the group
	// stays keyboard-reachable even if `value` matches no option
	const activeIndex = Math.max(0, options.findIndex((o) => o.value === value))

	return (
		<Track role="radiogroup" aria-label={ariaLabel}>
			{options.map((option, index) => {
				const active = option.value === value
				return (
					<Segment
						key={option.value}
						ref={(el) => {
							refs.current[index] = el
						}}
						type="button"
						role="radio"
						aria-checked={active}
						tabIndex={index === activeIndex ? 0 : -1}
						$active={active}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => handleKeyDown(event, index)}
					>
						{option.label}
					</Segment>
				)
			})}
		</Track>
	)
}
