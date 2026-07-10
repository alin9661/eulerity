import { describe, expect, it } from 'vitest';
import googleFixture from '../../api/__fixtures__/insights-google-7d.json';
import metaFixture from '../../api/__fixtures__/insights-meta-14d.json';
import { parseInsights } from '../../api/guards';
import { buildCsvRows, csvFilename } from '../csv';

// Fixtures are point-in-time captures (2026-07-10); every expected value below
// comes from the fixture itself, never from the real clock.
const google = parseInsights(googleFixture, 'google', 7);
const meta = parseInsights(metaFixture, 'meta', 14);

describe('buildCsvRows', () => {
	it('emits daily-grain rows with context columns first', () => {
		const rows = buildCsvRows([
			{
				network: 'google',
				platform: 'google',
				periodStart: google.period.startDate,
				periodEnd: google.period.endDate,
				rows: google.dailyData,
			},
		]);
		expect(rows).toHaveLength(7);
		expect(Object.keys(rows[0]).slice(0, 5)).toEqual(['network', 'platform', 'periodStart', 'periodEnd', 'date']);
		expect(rows[0]).toMatchObject({
			network: 'google',
			platform: 'google',
			periodStart: '2026-07-03',
			periodEnd: '2026-07-09',
			date: '2026-07-03',
		});
	});

	it('keeps values raw and unformatted (numbers, ISO dates — no "$" or grouping)', () => {
		const rows = buildCsvRows([
			{
				network: 'google',
				platform: 'google',
				periodStart: google.period.startDate,
				periodEnd: google.period.endDate,
				rows: google.dailyData,
			},
		]);
		expect(rows[0].impressions).toBe(34098);
		expect(rows[0].spend).toBe(659.47);
		expect(typeof rows[0].spend).toBe('number');
	});

	it('multi-section exports stay rectangular: every row carries the union of metric columns', () => {
		const context = { periodStart: meta.period.startDate, periodEnd: meta.period.endDate };
		const rows = buildCsvRows([
			{ network: 'meta', platform: 'facebook', ...context, rows: meta.dailyData.facebook },
			{ network: 'meta', platform: 'instagram', ...context, rows: meta.dailyData.instagram },
		]);
		expect(rows).toHaveLength(28);
		const keys = Object.keys(rows[0]).sort();
		for (const row of rows) {
			expect(Object.keys(row).sort()).toEqual(keys);
		}
		// Facebook rows have no saves; Instagram rows have no shares — both
		// columns exist everywhere, filled with empty cells where absent.
		const fb = rows[0];
		const ig = rows[14];
		expect(fb.platform).toBe('facebook');
		expect(fb.saves).toBe('');
		expect(typeof fb.shares).toBe('number');
		expect(ig.platform).toBe('instagram');
		expect(ig.shares).toBe('');
		expect(typeof ig.saves).toBe('number');
	});

	it('renders null metrics (undefined rates) as empty cells, never "null"', () => {
		const combinedRow = { date: '2026-06-26', impressions: 0, ctr: null };
		const rows = buildCsvRows([
			{
				network: 'meta',
				platform: 'combined',
				periodStart: '2026-06-26',
				periodEnd: '2026-07-09',
				rows: [combinedRow],
			},
		]);
		expect(rows[0].impressions).toBe(0);
		expect(rows[0].ctr).toBe('');
	});
});

describe('csvFilename', () => {
	it('matches the eulerity_<scope>_<start>_<end>.csv convention', () => {
		expect(csvFilename('google', '2026-06-26', '2026-07-09')).toBe('eulerity_google_2026-06-26_2026-07-09.csv');
	});
});
