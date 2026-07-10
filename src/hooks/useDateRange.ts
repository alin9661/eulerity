import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clampRange, defaultRange, todayISO } from '../lib/dates';

export interface DateRangeState {
	start: string;
	end: string;
	/** True when the active range equals the 14-day default (params elided from the URL). */
	isDefault: boolean;
	/** User Apply: clamps, then PUSHES so Back returns to the previous window. */
	setRange: (start: string, end: string) => void;
}

/**
 * URL `?start&end` is the single source of truth for the date range: ranges
 * are shareable/bookmarkable and survive reloads, and nav links can carry the
 * current window across pages. Invalid, partial, future, or out-of-bounds
 * params are clamped and the URL canonicalized in place.
 */
export function useDateRange(): DateRangeState {
	const [searchParams, setSearchParams] = useSearchParams();
	const rawStart = searchParams.get('start');
	const rawEnd = searchParams.get('end');

	const today = todayISO();

	const range = useMemo(() => {
		// No params at all = the default range (kept out of the URL).
		if (rawStart === null && rawEnd === null) return defaultRange(today);
		return clampRange(rawStart ?? '', rawEnd ?? '', today);
	}, [rawStart, rawEnd, today]);

	const fallback = defaultRange(today);
	const isDefault = range.start === fallback.start && range.end === fallback.end;

	// Canonical form: params elided entirely when equal to the default.
	const wantStart = isDefault ? null : range.start;
	const wantEnd = isDefault ? null : range.end;

	useEffect(() => {
		if (rawStart === wantStart && rawEnd === wantEnd) return;
		// REPLACE, not push: canonicalizing a bad/injected URL must not create a
		// history entry, or Back would bounce through the invalid URL forever.
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (wantStart === null || wantEnd === null) {
					next.delete('start');
					next.delete('end');
				} else {
					next.set('start', wantStart);
					next.set('end', wantEnd);
				}
				return next;
			},
			{ replace: true },
		);
	}, [rawStart, rawEnd, wantStart, wantEnd, setSearchParams]);

	const setRange = useCallback(
		(start: string, end: string) => {
			const now = todayISO();
			const clamped = clampRange(start, end, now);
			const def = defaultRange(now);
			const elide = clamped.start === def.start && clamped.end === def.end;
			// Default push (no `replace`): applying a range is a navigation.
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				if (elide) {
					next.delete('start');
					next.delete('end');
				} else {
					next.set('start', clamped.start);
					next.set('end', clamped.end);
				}
				return next;
			});
		},
		[setSearchParams],
	);

	return { start: range.start, end: range.end, isDefault, setRange };
}
