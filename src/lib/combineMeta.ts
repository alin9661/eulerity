import type { FacebookDaily, InstagramDaily, MetaInsights, TotalsOf } from '../api/types';
import { deriveRate } from './metrics';

// Client-side Facebook + Instagram combination (the API ships no combined rollup).
//
// Field policy:
// - SUMMED: the base metrics plus the engagement fields BOTH platforms report
//   (likes, comments). shares is Facebook-only and saves is Instagram-only, so
//   a "combined" value would silently be single-platform data.
// - EXCLUDED: reach — the same person can be reached on both platforms, so
//   fb.reach + ig.reach double-counts the overlapping audience. No honest
//   combined reach exists client-side.
const SUM_FIELDS = ['impressions', 'clicks', 'spend', 'conversions', 'likes', 'comments'] as const;
type SumField = (typeof SUM_FIELDS)[number];

export type CombinedMetaBases = Record<SumField, number>;

export interface CombinedMetaRates {
	ctr: number | null;
	cpc: number | null;
	cpm: number | null;
	costPerConversion: number | null;
}

export type CombinedMetaTotals = CombinedMetaBases & CombinedMetaRates;
export type CombinedMetaDaily = { date: string } & CombinedMetaTotals;

type PlatformBag = Partial<Record<SumField, number>>;

function sumBases(facebook: PlatformBag | undefined, instagram: PlatformBag | undefined): CombinedMetaBases {
	const out = {} as CombinedMetaBases;
	for (const field of SUM_FIELDS) {
		out[field] = (facebook?.[field] ?? 0) + (instagram?.[field] ?? 0);
	}
	return out;
}

// THE TRAP: rates must be RECOMPUTED from the summed bases via the registry,
// never summed or averaged. avg(fb.ctr, ig.ctr) weighs a 1k-impression
// platform-day the same as a 100k-impression one — the API's own totals follow
// the same recompute-from-bases rule (SPEC.md §3).
function ratesFrom(bases: CombinedMetaBases): CombinedMetaRates {
	return {
		ctr: deriveRate('ctr', bases),
		cpc: deriveRate('cpc', bases),
		cpm: deriveRate('cpm', bases),
		costPerConversion: deriveRate('costPerConversion', bases),
	};
}

/** Combine a totals or previousTotals object (both platforms' totals in, one combined totals out). */
export function combineMetaTotals(totals: {
	facebook: TotalsOf<FacebookDaily>;
	instagram: TotalsOf<InstagramDaily>;
}): CombinedMetaTotals {
	const bases = sumBases(totals.facebook, totals.instagram);
	return { ...bases, ...ratesFrom(bases) };
}

/**
 * Combine per-day rows from ANY window's dailyData — the current view or the
 * ghost-overlay previous window. Rows are joined by date; a date present on
 * only one platform still yields a row (the missing side contributes zeros).
 */
export function combineMeta(daily: MetaInsights['dailyData']): CombinedMetaDaily[] {
	const byDate = new Map<string, { fb?: FacebookDaily; ig?: InstagramDaily }>();
	for (const row of daily.facebook) byDate.set(row.date, { fb: row });
	for (const row of daily.instagram) byDate.set(row.date, { ...byDate.get(row.date), ig: row });

	// ISO dates sort lexicographically === chronologically.
	return [...byDate.keys()].sort().map((date) => {
		const { fb, ig } = byDate.get(date)!;
		const bases = sumBases(fb, ig);
		return { date, ...bases, ...ratesFrom(bases) };
	});
}
