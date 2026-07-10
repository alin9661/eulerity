import { describe, expect, it } from 'vitest';
import googleFixture from '../../api/__fixtures__/insights-google-14d.json';
import linkedinFixture from '../../api/__fixtures__/insights-linkedin-14d.json';
import metaFixture from '../../api/__fixtures__/insights-meta-14d.json';
import summaryFixture from '../../api/__fixtures__/summary.json';
import { ApiError } from '../../api/client';
import { parseInsights, parseSummary } from '../../api/guards';

// Fixtures are point-in-time captures (2026-07-10): window lengths are passed
// explicitly to match each capture, never derived from today's date.

function expectMalformed(fn: () => unknown): void {
	let thrown: unknown;
	try {
		fn();
	} catch (err) {
		thrown = err;
	}
	expect(thrown).toBeInstanceOf(ApiError);
	expect((thrown as ApiError).code).toBe('MALFORMED_RESPONSE');
}

type Mutable = Record<string, any>;
const clone = <T>(value: T): Mutable => structuredClone(value) as Mutable;

describe('parseInsights', () => {
	it('accepts the captured fixtures for all three networks', () => {
		expect(parseInsights(googleFixture, 'google', 14).network).toBe('google');
		expect(parseInsights(linkedinFixture, 'linkedin', 14).network).toBe('linkedin');
		expect(parseInsights(metaFixture, 'meta', 14).network).toBe('meta');
	});

	it('rejects a wrong network discriminant', () => {
		expectMalformed(() => parseInsights(googleFixture, 'meta', 14));
	});

	it('rejects a truncated flat dailyData (length !== windowDays)', () => {
		const broken = clone(googleFixture);
		broken.dailyData.pop();
		expectMalformed(() => parseInsights(broken, 'google', 14));
	});

	it('rejects a per-platform meta dailyData length mismatch', () => {
		const broken = clone(metaFixture);
		broken.dailyData.instagram.pop();
		expectMalformed(() => parseInsights(broken, 'meta', 14));
	});

	it('rejects non-finite / non-number metric values', () => {
		const broken = clone(googleFixture);
		broken.dailyData[3].impressions = '33694'; // string smuggled into a numeric field
		expectMalformed(() => parseInsights(broken, 'google', 14));
	});

	it('rejects missing totals fields', () => {
		const broken = clone(linkedinFixture);
		delete broken.totals.follows;
		expectMalformed(() => parseInsights(broken, 'linkedin', 14));
	});

	it('rejects malformed dates on rows', () => {
		const broken = clone(googleFixture);
		broken.dailyData[0].date = '07/03/2026';
		expectMalformed(() => parseInsights(broken, 'google', 14));
	});

	it('rejects non-object payloads', () => {
		expectMalformed(() => parseInsights(null, 'google', 14));
		expectMalformed(() => parseInsights([], 'google', 14));
		expectMalformed(() => parseInsights('<html>gateway error</html>', 'google', 14));
	});
});

describe('parseSummary', () => {
	it('accepts the captured summary fixture', () => {
		const summary = parseSummary(summaryFixture);
		expect(summary.period.endDate).toBe('2026-07-10');
		expect(summary.google.dailyData).toHaveLength(30);
	});

	it('rejects a summary missing a channel', () => {
		const broken = clone(summaryFixture);
		delete broken.linkedin;
		expectMalformed(() => parseSummary(broken));
	});

	it('rejects a summary whose dailyData does not span the stated period', () => {
		const broken = clone(summaryFixture);
		broken.meta.facebook.dailyData.pop();
		expectMalformed(() => parseSummary(broken));
	});
});
