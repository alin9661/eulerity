import { rangeLengthDays } from '../lib/dates';
import { ApiError } from './client';
import type {
	GoogleInsights,
	InsightsResponse,
	LinkedInInsights,
	MetaInsights,
	Network,
	Period,
	SummaryResponse,
} from './types';

// Lean runtime trust boundary at the fetch edge: shape + finite-number checks
// only, so a half-broken payload becomes one typed ApiError instead of NaN
// silently propagating into KPI math, charts, and CSV exports.

function fail(detail: string): never {
	throw new ApiError('MALFORMED_RESPONSE', `Malformed API response: ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkPeriod(value: unknown, path: string): Period {
	if (!isRecord(value)) fail(`${path} is not an object`);
	for (const field of ['startDate', 'endDate'] as const) {
		const v = value[field];
		if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) fail(`${path}.${field} is not a YYYY-MM-DD date`);
	}
	return value as unknown as Period;
}

const BASE_FIELDS = ['impressions', 'clicks', 'spend', 'conversions'] as const;
const RATE_FIELDS = ['ctr', 'cpc', 'cpm'] as const;
const GOOGLE_FIELDS = [...BASE_FIELDS, ...RATE_FIELDS, 'costPerConversion'];
const FACEBOOK_FIELDS = [...BASE_FIELDS, ...RATE_FIELDS, 'reach', 'likes', 'comments', 'shares'];
const INSTAGRAM_FIELDS = [...BASE_FIELDS, ...RATE_FIELDS, 'reach', 'likes', 'comments', 'saves'];
const LINKEDIN_FIELDS = [...BASE_FIELDS, ...RATE_FIELDS, 'likes', 'comments', 'shares', 'follows'];

function checkNumbers(value: unknown, fields: readonly string[], path: string): void {
	if (!isRecord(value)) fail(`${path} is not an object`);
	for (const field of fields) {
		const v = value[field];
		if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${path}.${field} is not a finite number`);
	}
}

function checkRows(value: unknown, expectedLength: number, fields: readonly string[], path: string): void {
	if (!Array.isArray(value)) fail(`${path} is not an array`);
	// Exactly one row per day of the window: a mismatch means a truncated or
	// misaligned payload, which would corrupt day-offset ghost alignment and CSVs.
	if (value.length !== expectedLength) fail(`${path} has ${value.length} rows, expected ${expectedLength}`);
	value.forEach((row, i) => {
		if (!isRecord(row) || typeof row.date !== 'string' || !ISO_DATE_RE.test(row.date)) {
			fail(`${path}[${i}].date is not a YYYY-MM-DD date`);
		}
		checkNumbers(row, fields, `${path}[${i}]`);
	});
}

function checkSummaryChannel(value: unknown, days: number, path: string): void {
	if (!isRecord(value)) fail(`${path} is not an object`);
	checkNumbers(value.totals, BASE_FIELDS, `${path}.totals`);
	checkNumbers(value.previousTotals, BASE_FIELDS, `${path}.previousTotals`);
	checkRows(value.dailyData, days, BASE_FIELDS, `${path}.dailyData`);
}

export function parseSummary(json: unknown): SummaryResponse {
	if (!isRecord(json)) fail('summary payload is not an object');
	const period = checkPeriod(json.period, 'period');
	checkPeriod(json.previousPeriod, 'previousPeriod');
	const days = rangeLengthDays(period.startDate, period.endDate);
	if (!isRecord(json.meta)) fail('meta is not an object');
	checkSummaryChannel(json.meta.facebook, days, 'meta.facebook');
	checkSummaryChannel(json.meta.instagram, days, 'meta.instagram');
	checkSummaryChannel(json.google, days, 'google');
	checkSummaryChannel(json.linkedin, days, 'linkedin');
	return json as unknown as SummaryResponse;
}

export function parseInsights(json: unknown, network: 'google', windowDays: number): GoogleInsights;
export function parseInsights(json: unknown, network: 'linkedin', windowDays: number): LinkedInInsights;
export function parseInsights(json: unknown, network: 'meta', windowDays: number): MetaInsights;
export function parseInsights(json: unknown, network: Network, windowDays: number): InsightsResponse;
export function parseInsights(json: unknown, network: Network, windowDays: number): InsightsResponse {
	if (!isRecord(json)) fail('insights payload is not an object');
	if (json.network !== network) {
		fail(`network discriminant is ${JSON.stringify(json.network)}, expected "${network}"`);
	}
	checkPeriod(json.period, 'period');
	checkPeriod(json.previousPeriod, 'previousPeriod');

	if (network === 'meta') {
		for (const [name, value] of [
			['totals', json.totals],
			['previousTotals', json.previousTotals],
		] as const) {
			if (!isRecord(value)) fail(`${name} is not an object`);
			checkNumbers(value.facebook, FACEBOOK_FIELDS, `${name}.facebook`);
			checkNumbers(value.instagram, INSTAGRAM_FIELDS, `${name}.instagram`);
		}
		if (!isRecord(json.dailyData)) fail('dailyData is not an object');
		checkRows(json.dailyData.facebook, windowDays, FACEBOOK_FIELDS, 'dailyData.facebook');
		checkRows(json.dailyData.instagram, windowDays, INSTAGRAM_FIELDS, 'dailyData.instagram');
	} else {
		const fields = network === 'google' ? GOOGLE_FIELDS : LINKEDIN_FIELDS;
		checkNumbers(json.totals, fields, 'totals');
		checkNumbers(json.previousTotals, fields, 'previousTotals');
		checkRows(json.dailyData, windowDays, fields, 'dailyData');
	}

	return json as unknown as InsightsResponse;
}
