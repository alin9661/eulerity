export type MetricKey =
	| 'impressions'
	| 'clicks'
	| 'spend'
	| 'conversions'
	| 'ctr'
	| 'cpc'
	| 'cpm'
	| 'costPerConversion'
	| 'reach'
	| 'likes'
	| 'comments'
	| 'shares'
	| 'saves'
	| 'follows';

export type MetricFormat = 'int' | 'compact' | 'currency' | 'currency-precise' | 'percent';
export type MetricDirection = 'up-good' | 'down-good' | 'neutral';

export interface DerivedSpec {
	num: MetricKey;
	den: MetricKey;
	scale: number;
}

export interface MetricDef {
	label: string;
	format: MetricFormat;
	direction: MetricDirection;
	/** Present when the metric is a rate computable from base metrics: num/den*scale. */
	derived?: DerivedSpec;
}

export const METRIC_REGISTRY: Record<MetricKey, MetricDef> = {
	impressions: { label: 'Impressions', format: 'compact', direction: 'up-good' },
	clicks: { label: 'Clicks', format: 'compact', direction: 'up-good' },
	// WHY neutral: spend has no intrinsic good direction — up can be scale
	// (good) or waste (bad). Efficiency reads through costPerConversion instead.
	// This is our resolution of the underspecified "favorable/unfavorable on
	// each metric" requirement; see README.
	spend: { label: 'Spend', format: 'currency', direction: 'neutral' },
	conversions: { label: 'Conversions', format: 'int', direction: 'up-good' },
	ctr: { label: 'CTR', format: 'percent', direction: 'up-good', derived: { num: 'clicks', den: 'impressions', scale: 100 } },
	cpc: { label: 'CPC', format: 'currency-precise', direction: 'down-good', derived: { num: 'spend', den: 'clicks', scale: 1 } },
	cpm: { label: 'CPM', format: 'currency-precise', direction: 'down-good', derived: { num: 'spend', den: 'impressions', scale: 1000 } },
	// Native on Google rows only; derivable everywhere from spend/conversions.
	costPerConversion: { label: 'Cost / Conv.', format: 'currency-precise', direction: 'down-good', derived: { num: 'spend', den: 'conversions', scale: 1 } },
	reach: { label: 'Reach', format: 'compact', direction: 'up-good' },
	likes: { label: 'Likes', format: 'int', direction: 'up-good' },
	comments: { label: 'Comments', format: 'int', direction: 'up-good' },
	shares: { label: 'Shares', format: 'int', direction: 'up-good' },
	saves: { label: 'Saves', format: 'int', direction: 'up-good' },
	follows: { label: 'Follows', format: 'int', direction: 'up-good' },
};

export type MetricBag = Readonly<Partial<Record<MetricKey, number>>>;

/**
 * Compute a metric from a bag of base values via the registry. Returns null on
 * a zero/absent denominator — a rate with no denominator is UNDEFINED, not 0
 * (LinkedIn's near-zero weekends make this a real path, not defensive coding).
 * Non-derived keys pass through their own value.
 */
export function deriveRate(key: MetricKey, bases: MetricBag): number | null {
	const spec = METRIC_REGISTRY[key].derived;
	if (!spec) {
		const value = bases[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	}
	const num = bases[spec.num];
	const den = bases[spec.den];
	if (
		typeof num !== 'number' ||
		typeof den !== 'number' ||
		!Number.isFinite(num) ||
		!Number.isFinite(den) ||
		den === 0
	) {
		return null;
	}
	return (num / den) * spec.scale;
}

const intFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const preciseFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Display formatting with FIXED decimal counts per format so tabular-nums
 * columns stay aligned. null/non-finite renders as an em dash — no NaN%,
 * $Infinity, or 0-masquerading-as-undefined ever reaches the UI.
 */
export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return '—';
	switch (format) {
		case 'int':
			return intFormatter.format(value);
		case 'compact':
			// Compact only at millions so KPI tiles don't wrap; below that, grouping is enough.
			if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
			return intFormatter.format(value);
		case 'currency':
			return `$${intFormatter.format(value)}`;
		case 'currency-precise':
			return `$${preciseFormatter.format(value)}`;
		case 'percent':
			return `${value.toFixed(2)}%`;
	}
}
