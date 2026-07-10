import { rangeLengthDays } from '../lib/dates';
import { parseInsights, parseSummary } from './guards';
import type {
	ApiErrorBody,
	GoogleInsights,
	InsightsResponse,
	LinkedInInsights,
	MetaInsights,
	Network,
	SummaryResponse,
} from './types';

export const API_BASE = 'https://eulerity-hackathon.appspot.com';

const SERVER_ERROR_CODES = [
	'MISSING_PARAM',
	'INVALID_NETWORK',
	'INVALID_DATE_FORMAT',
	'INVALID_DATE_RANGE',
	'WINDOW_TOO_SMALL',
	'WINDOW_TOO_LARGE',
	'NOT_FOUND',
	'METHOD_NOT_ALLOWED',
] as const;

export type ApiErrorCode =
	| (typeof SERVER_ERROR_CODES)[number]
	// Synthetic client-side codes: fetch/DNS/offline failures and payloads that
	// fail the guards in guards.ts.
	| 'NETWORK'
	| 'MALFORMED_RESPONSE';

const KNOWN_CODES: ReadonlySet<string> = new Set(SERVER_ERROR_CODES);

export class ApiError extends Error {
	readonly code: ApiErrorCode;

	constructor(code: ApiErrorCode, message?: string) {
		super(message ?? code);
		this.name = 'ApiError';
		this.code = code;
	}
}

/**
 * GET `${API_BASE}${path}` and return parsed JSON. Every failure mode becomes
 * a typed ApiError, EXCEPT the caller's own AbortError, which is rethrown
 * as-is so cancellation is distinguishable from real errors upstream.
 */
export async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${API_BASE}${path}`, { signal });
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') throw err;
		throw new ApiError('NETWORK', 'Could not reach the metrics API. Check your connection and retry.');
	}

	if (!response.ok) {
		let body: Partial<ApiErrorBody> | null = null;
		try {
			body = (await response.json()) as Partial<ApiErrorBody>;
		} catch {
			// Non-JSON error body (e.g. an HTML gateway page) — fall through to generic.
		}
		const code =
			body && typeof body.error === 'string' && KNOWN_CODES.has(body.error)
				? (body.error as ApiErrorCode)
				: 'NETWORK';
		const message =
			body && typeof body.message === 'string' ? body.message : `Request failed with status ${response.status}.`;
		throw new ApiError(code, message);
	}

	try {
		return await response.json();
	} catch {
		throw new ApiError('MALFORMED_RESPONSE', 'The API returned a response that is not valid JSON.');
	}
}

export async function getSummary(signal?: AbortSignal): Promise<SummaryResponse> {
	return parseSummary(await fetchJson('/v1/metrics-summary', signal));
}

export function getInsights(
	network: 'google',
	startDate: string,
	endDate: string,
	signal?: AbortSignal,
): Promise<GoogleInsights>;
export function getInsights(
	network: 'linkedin',
	startDate: string,
	endDate: string,
	signal?: AbortSignal,
): Promise<LinkedInInsights>;
export function getInsights(
	network: 'meta',
	startDate: string,
	endDate: string,
	signal?: AbortSignal,
): Promise<MetaInsights>;
export function getInsights(
	network: Network,
	startDate: string,
	endDate: string,
	signal?: AbortSignal,
): Promise<InsightsResponse>;
export async function getInsights(
	network: Network,
	startDate: string,
	endDate: string,
	signal?: AbortSignal,
): Promise<InsightsResponse> {
	const query = new URLSearchParams({ network, startDate, endDate });
	const json = await fetchJson(`/v1/metrics-insights?${query.toString()}`, signal);
	return parseInsights(json, network, rangeLengthDays(startDate, endDate));
}
