/** Calendar date as 'YYYY-MM-DD'. Never feed one to `new Date(...)` — see lib/dates.ts. */
export type ISODate = string;

export interface Period {
	startDate: ISODate;
	endDate: ISODate;
}

/** The only metrics the summary endpoint carries; the insights base row extends this. */
export interface BaseDaily {
	date: ISODate;
	impressions: number;
	clicks: number;
	spend: number; // USD
	conversions: number;
}

export interface RateFields {
	ctr: number; // %
	cpc: number; // USD
	cpm: number; // USD per 1k impressions
}

export interface GoogleDaily extends BaseDaily, RateFields {
	costPerConversion: number; // USD; the API sends 0 (not null) when conversions === 0
}

export interface FacebookDaily extends BaseDaily, RateFields {
	reach: number;
	likes: number;
	comments: number;
	shares: number;
}

export interface InstagramDaily extends BaseDaily, RateFields {
	reach: number;
	likes: number;
	comments: number;
	saves: number;
}

export interface LinkedInDaily extends BaseDaily, RateFields {
	likes: number;
	comments: number;
	shares: number;
	follows: number;
}

/** totals / previousTotals objects carry every daily field except the date. */
export type TotalsOf<D> = Omit<D, 'date'>;

interface InsightsBase {
	period: Period;
	previousPeriod: Period;
}

export interface GoogleInsights extends InsightsBase {
	network: 'google';
	totals: TotalsOf<GoogleDaily>;
	previousTotals: TotalsOf<GoogleDaily>;
	dailyData: GoogleDaily[];
}

export interface LinkedInInsights extends InsightsBase {
	network: 'linkedin';
	totals: TotalsOf<LinkedInDaily>;
	previousTotals: TotalsOf<LinkedInDaily>;
	dailyData: LinkedInDaily[];
}

/**
 * Meta is split per platform at every level — the API provides NO combined
 * rollup. Client-side combination lives in lib/combineMeta.ts.
 */
export interface MetaInsights extends InsightsBase {
	network: 'meta';
	totals: { facebook: TotalsOf<FacebookDaily>; instagram: TotalsOf<InstagramDaily> };
	previousTotals: { facebook: TotalsOf<FacebookDaily>; instagram: TotalsOf<InstagramDaily> };
	dailyData: { facebook: FacebookDaily[]; instagram: InstagramDaily[] };
}

export type InsightsResponse = GoogleInsights | LinkedInInsights | MetaInsights;
export type Network = InsightsResponse['network'];

/**
 * Summary types are deliberately separate from insights: the summary endpoint
 * returns BASE metrics only (no ctr/cpc/cpm on rows or totals — verified).
 * Dashboard rate KPIs must be derived client-side from these bases.
 */
export type SummaryTotals = TotalsOf<BaseDaily>;

export interface SummaryChannel {
	totals: SummaryTotals;
	previousTotals: SummaryTotals;
	dailyData: BaseDaily[];
}

export interface SummaryResponse {
	period: Period;
	previousPeriod: Period;
	meta: { facebook: SummaryChannel; instagram: SummaryChannel };
	google: SummaryChannel;
	linkedin: SummaryChannel;
}

/** Shape of every non-2xx body: { "error": "CODE", "message": "..." }. */
export interface ApiErrorBody {
	error: string;
	message: string;
}
