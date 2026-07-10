import type { MetricDirection } from './metrics';

export type DeltaArrow = 'up' | 'down' | 'flat';

export type Delta = { kind: 'undefined' } | { kind: 'value'; pct: number; arrow: DeltaArrow };

export type Favorability = 'favorable' | 'unfavorable' | 'neutral';

/**
 * Period-over-period % change. previous === 0 (or either side null/non-finite)
 * yields the explicit 'undefined' state rendered as "—".
 *
 * WHY this is a real path and not belt-and-braces: LinkedIn weekends run at
 * ~7% of weekday volume (intentional, per spec), so short or shifted windows
 * can genuinely have 0 conversions — or a null derived rate — in the
 * comparison period. Dividing by that would paint NaN%/∞% on the dashboard.
 */
export function computeDelta(current: number | null | undefined, previous: number | null | undefined): Delta {
	if (
		current === null ||
		current === undefined ||
		previous === null ||
		previous === undefined ||
		!Number.isFinite(current) ||
		!Number.isFinite(previous) ||
		previous === 0
	) {
		return { kind: 'undefined' };
	}
	const pct = ((current - previous) / previous) * 100;
	return { kind: 'value', pct, arrow: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

/** Map a delta onto the metric's direction (spend is 'neutral' by design — see METRIC_REGISTRY). */
export function favorability(delta: Delta, direction: MetricDirection): Favorability {
	if (delta.kind === 'undefined' || delta.arrow === 'flat' || direction === 'neutral') return 'neutral';
	return (delta.arrow === 'up') === (direction === 'up-good') ? 'favorable' : 'unfavorable';
}
