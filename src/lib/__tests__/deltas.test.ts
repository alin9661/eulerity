import { describe, expect, it } from 'vitest';
import { computeDelta, favorability } from '../deltas';

describe('computeDelta', () => {
	it('computes signed % change with the right arrow', () => {
		expect(computeDelta(120, 100)).toEqual({ kind: 'value', pct: 20, arrow: 'up' });
		expect(computeDelta(80, 100)).toEqual({ kind: 'value', pct: -20, arrow: 'down' });
		expect(computeDelta(100, 100)).toEqual({ kind: 'value', pct: 0, arrow: 'flat' });
	});

	it('previous === 0 is undefined, not Infinity (real path: LinkedIn near-zero weekends)', () => {
		expect(computeDelta(42, 0)).toEqual({ kind: 'undefined' });
	});

	it('null / undefined / non-finite inputs are undefined deltas', () => {
		expect(computeDelta(null, 100)).toEqual({ kind: 'undefined' });
		expect(computeDelta(100, null)).toEqual({ kind: 'undefined' });
		expect(computeDelta(undefined, 100)).toEqual({ kind: 'undefined' });
		expect(computeDelta(NaN, 100)).toEqual({ kind: 'undefined' });
		expect(computeDelta(100, Infinity)).toEqual({ kind: 'undefined' });
	});

	it('current === 0 with a real previous is a defined -100%', () => {
		expect(computeDelta(0, 50)).toEqual({ kind: 'value', pct: -100, arrow: 'down' });
	});
});

describe('favorability', () => {
	it('up-good: up is favorable, down is unfavorable', () => {
		expect(favorability(computeDelta(120, 100), 'up-good')).toBe('favorable');
		expect(favorability(computeDelta(80, 100), 'up-good')).toBe('unfavorable');
	});

	it('down-good (unit costs like CPC): down is favorable, up is unfavorable', () => {
		expect(favorability(computeDelta(0.4, 0.5), 'down-good')).toBe('favorable');
		expect(favorability(computeDelta(0.6, 0.5), 'down-good')).toBe('unfavorable');
	});

	it('neutral direction (spend) is always neutral regardless of arrow', () => {
		expect(favorability(computeDelta(120, 100), 'neutral')).toBe('neutral');
		expect(favorability(computeDelta(80, 100), 'neutral')).toBe('neutral');
	});

	it('undefined deltas and flat deltas are neutral', () => {
		expect(favorability(computeDelta(42, 0), 'up-good')).toBe('neutral');
		expect(favorability(computeDelta(100, 100), 'down-good')).toBe('neutral');
	});
});
