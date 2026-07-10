import { describe, expect, it } from 'vitest';
import { addDays, clampRange, defaultRange, diffDays, isValidISODate, rangeLengthDays } from '../dates';

// Fixtures (and these expectations) are point-in-time captures from
// 2026-07-10. Tests must never read the real clock: `today` is always passed
// explicitly so the suite is green on any day it runs.
const TODAY = '2026-07-10';

describe('serial-day arithmetic', () => {
	it('adds days across month and year boundaries', () => {
		expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
		expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
	});

	it('handles leap days', () => {
		expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
		expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
	});

	it('diffDays is signed and exclusive of one endpoint', () => {
		expect(diffDays('2026-06-26', '2026-07-09')).toBe(13);
		expect(diffDays('2026-07-09', '2026-06-26')).toBe(-13);
	});

	it('rangeLengthDays counts BOTH endpoints (the API convention) — the off-by-one trap', () => {
		expect(rangeLengthDays('2026-06-26', '2026-07-09')).toBe(14);
		expect(rangeLengthDays('2026-07-10', '2026-07-10')).toBe(1);
	});

	it('rejects impossible and malformed dates', () => {
		expect(isValidISODate('2026-02-30')).toBe(false);
		expect(isValidISODate('2026-13-01')).toBe(false);
		expect(isValidISODate('garbage')).toBe(false);
		expect(isValidISODate('2026-07-10')).toBe(true);
	});
});

describe('defaultRange', () => {
	it('is 14 inclusive days ending today', () => {
		expect(defaultRange(TODAY)).toEqual({ start: '2026-06-27', end: '2026-07-10' });
	});
});

describe('clampRange', () => {
	it('passes a valid 7-day window through unchanged (min bound)', () => {
		expect(clampRange('2026-07-04', '2026-07-10', TODAY)).toEqual({ start: '2026-07-04', end: '2026-07-10' });
	});

	it('passes a valid 30-day window through unchanged (max bound)', () => {
		expect(clampRange('2026-06-11', '2026-07-10', TODAY)).toEqual({ start: '2026-06-11', end: '2026-07-10' });
	});

	it('pulls the start forward when the window exceeds 30 days', () => {
		expect(clampRange('2026-06-01', '2026-07-10', TODAY)).toEqual({ start: '2026-06-11', end: '2026-07-10' });
	});

	it('clamps a future end to today (the API fabricates future data)', () => {
		expect(clampRange('2026-07-01', '2026-07-20', TODAY)).toEqual({ start: '2026-07-01', end: '2026-07-10' });
	});

	it('resets to the default range when the window is under 7 days', () => {
		expect(clampRange('2026-07-05', '2026-07-10', TODAY)).toEqual(defaultRange(TODAY));
	});

	it('resets when clamping a future end leaves fewer than 7 days', () => {
		expect(clampRange('2026-07-09', '2026-07-20', TODAY)).toEqual(defaultRange(TODAY));
	});

	it('resets on an inverted range', () => {
		expect(clampRange('2026-07-09', '2026-07-01', TODAY)).toEqual(defaultRange(TODAY));
	});

	it('resets on garbage or impossible dates', () => {
		expect(clampRange('not-a-date', '2026-07-10', TODAY)).toEqual(defaultRange(TODAY));
		expect(clampRange('2026-02-30', '2026-07-10', TODAY)).toEqual(defaultRange(TODAY));
		expect(clampRange('', '', TODAY)).toEqual(defaultRange(TODAY));
	});
});
