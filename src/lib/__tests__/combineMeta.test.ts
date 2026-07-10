import { describe, expect, it } from 'vitest';
import metaFixture from '../../api/__fixtures__/insights-meta-14d.json';
import { parseInsights } from '../../api/guards';
import type { FacebookDaily, InstagramDaily } from '../../api/types';
import { combineMeta, combineMetaTotals } from '../combineMeta';

// Point-in-time fixture captured 2026-07-10 (window 2026-06-26 → 2026-07-09).
// Assertions are relative to the fixture's own numbers, never today's date.
const meta = parseInsights(metaFixture, 'meta', 14);

const fbRow = (date: string, over: Partial<FacebookDaily> = {}): FacebookDaily => ({
	date,
	impressions: 1000,
	clicks: 20,
	spend: 10,
	conversions: 2,
	reach: 800,
	likes: 5,
	comments: 2,
	shares: 1,
	ctr: 2,
	cpc: 0.5,
	cpm: 10,
	...over,
});

const igRow = (date: string, over: Partial<InstagramDaily> = {}): InstagramDaily => ({
	date,
	impressions: 500,
	clicks: 5,
	spend: 4,
	conversions: 1,
	reach: 400,
	likes: 9,
	comments: 3,
	saves: 2,
	ctr: 1,
	cpc: 0.8,
	cpm: 8,
	...over,
});

describe('combineMeta (daily rows)', () => {
	const combined = combineMeta(meta.dailyData);

	it('produces one row per window day, dates ascending', () => {
		expect(combined).toHaveLength(14);
		expect(combined.map((r) => r.date)).toEqual(meta.dailyData.facebook.map((r) => r.date));
	});

	it('sums base metrics and shared engagement per date', () => {
		combined.forEach((row, i) => {
			const fb = meta.dailyData.facebook[i];
			const ig = meta.dailyData.instagram[i];
			expect(row.impressions).toBe(fb.impressions + ig.impressions);
			expect(row.clicks).toBe(fb.clicks + ig.clicks);
			expect(row.spend).toBeCloseTo(fb.spend + ig.spend, 9);
			expect(row.conversions).toBe(fb.conversions + ig.conversions);
			expect(row.likes).toBe(fb.likes + ig.likes);
			expect(row.comments).toBe(fb.comments + ig.comments);
		});
	});

	it('RECOMPUTES rates from summed bases — never sums or averages platform rates', () => {
		combined.forEach((row, i) => {
			const fb = meta.dailyData.facebook[i];
			const ig = meta.dailyData.instagram[i];
			const expectedCtr = ((fb.clicks + ig.clicks) / (fb.impressions + ig.impressions)) * 100;
			expect(row.ctr).not.toBeNull();
			expect(Math.abs((row.ctr as number) - expectedCtr)).toBeLessThan(1e-9);
			const expectedCpc = (fb.spend + ig.spend) / (fb.clicks + ig.clicks);
			expect(Math.abs((row.cpc as number) - expectedCpc)).toBeLessThan(1e-9);
			const expectedCpm = ((fb.spend + ig.spend) / (fb.impressions + ig.impressions)) * 1000;
			expect(Math.abs((row.cpm as number) - expectedCpm)).toBeLessThan(1e-9);
		});
	});

	it('excludes reach (audience overlap) and single-platform fields (shares, saves)', () => {
		for (const row of combined) {
			expect(row).not.toHaveProperty('reach');
			expect(row).not.toHaveProperty('shares');
			expect(row).not.toHaveProperty('saves');
		}
	});

	it('treats dates missing on one platform as zeros (ghost-window support)', () => {
		const rows = combineMeta({ facebook: [fbRow('2026-06-01')], instagram: [igRow('2026-06-02')] });
		expect(rows.map((r) => r.date)).toEqual(['2026-06-01', '2026-06-02']);
		expect(rows[0].impressions).toBe(1000); // ig side = zeros
		expect(rows[1].impressions).toBe(500); // fb side = zeros
		expect(rows[1].likes).toBe(9);
	});

	it('yields null rates on a zero denominator instead of NaN/Infinity', () => {
		const rows = combineMeta({
			facebook: [fbRow('2026-06-01', { impressions: 0, clicks: 0, spend: 0, conversions: 0 })],
			instagram: [igRow('2026-06-01', { impressions: 0, clicks: 0, spend: 0, conversions: 0 })],
		});
		expect(rows[0].ctr).toBeNull();
		expect(rows[0].cpc).toBeNull();
		expect(rows[0].cpm).toBeNull();
		expect(rows[0].costPerConversion).toBeNull();
	});
});

describe('combineMetaTotals', () => {
	const combined = combineMetaTotals(meta.totals);
	const fb = meta.totals.facebook;
	const ig = meta.totals.instagram;

	it('sums bases across platforms', () => {
		expect(combined.impressions).toBe(fb.impressions + ig.impressions);
		expect(combined.clicks).toBe(fb.clicks + ig.clicks);
		expect(combined.spend).toBeCloseTo(fb.spend + ig.spend, 9);
	});

	it('combined CTR equals sum(clicks)/sum(impressions)*100, not the average of platform CTRs', () => {
		const expected = ((fb.clicks + ig.clicks) / (fb.impressions + ig.impressions)) * 100;
		expect(combined.ctr).not.toBeNull();
		expect(Math.abs((combined.ctr as number) - expected)).toBeLessThan(1e-9);
		// The naive average is measurably different on this fixture — proving we
		// would catch a regression to averaging.
		const naiveAverage = (fb.ctr + ig.ctr) / 2;
		expect(Math.abs((combined.ctr as number) - naiveAverage)).toBeGreaterThan(1e-6);
	});

	it('excludes reach from combined totals', () => {
		expect(combined).not.toHaveProperty('reach');
	});
});
