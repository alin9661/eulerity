// Pure ISO-8601 ('YYYY-MM-DD') string date math.
//
// WHY no `new Date('YYYY-MM-DD')` anywhere: the Date parser treats a bare ISO
// date as UTC MIDNIGHT, so local getters render it as the PREVIOUS day in every
// timezone west of Greenwich — each label and window bound would be off by one
// for US users. All arithmetic below is integer math on serial day numbers,
// which is also DST-immune (no milliseconds-per-day assumptions).

export interface YMD {
	y: number;
	m: number;
	d: number;
}

export interface DateRange {
	start: string;
	end: string;
}

export const MIN_WINDOW_DAYS = 7;
export const MAX_WINDOW_DAYS = 30;
export const DEFAULT_WINDOW_DAYS = 14;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISO(iso: string): YMD {
	return {
		y: Number(iso.slice(0, 4)),
		m: Number(iso.slice(5, 7)),
		d: Number(iso.slice(8, 10)),
	};
}

function pad(n: number, width: number): string {
	return String(n).padStart(width, '0');
}

export function formatISO({ y, m, d }: YMD): string {
	return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

/** Days since 1970-01-01 (Howard Hinnant's civil-calendar algorithm; pure integers). */
export function toSerialDay(iso: string): number {
	const { y, m, d } = parseISO(iso);
	const shiftedYear = m <= 2 ? y - 1 : y;
	const era = Math.floor(shiftedYear / 400);
	const yearOfEra = shiftedYear - era * 400;
	const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
	const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
	return era * 146097 + dayOfEra - 719468;
}

export function fromSerialDay(serial: number): string {
	const z = serial + 719468;
	const era = Math.floor(z / 146097);
	const dayOfEra = z - era * 146097;
	const yearOfEra = Math.floor(
		(dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
	);
	const y = yearOfEra + era * 400;
	const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
	const mp = Math.floor((5 * dayOfYear + 2) / 153);
	const d = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
	const m = mp < 10 ? mp + 3 : mp - 9;
	return formatISO({ y: m <= 2 ? y + 1 : y, m, d });
}

export function addDays(iso: string, days: number): string {
	return fromSerialDay(toSerialDay(iso) + days);
}

/** Signed day count from `from` to `to` (exclusive of one endpoint). */
export function diffDays(from: string, to: string): number {
	return toSerialDay(to) - toSerialDay(from);
}

/** Inclusive of BOTH endpoints — the API counts windows this way (7d = start..start+6). */
export function rangeLengthDays(start: string, end: string): number {
	return diffDays(start, end) + 1;
}

export function isValidISODate(iso: string): boolean {
	// Round-tripping through serial-day math rejects impossible dates like 2026-02-30.
	return ISO_DATE_RE.test(iso) && fromSerialDay(toSerialDay(iso)) === iso;
}

/** Local calendar date via component getters — no string parsing, no UTC involved. */
export function todayISO(now: Date = new Date()): string {
	return formatISO({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

/** Challenge default: 14 inclusive days ending today. */
export function defaultRange(today: string = todayISO()): DateRange {
	return { start: addDays(today, -(DEFAULT_WINDOW_DAYS - 1)), end: today };
}

/**
 * Clamp an arbitrary (possibly URL-injected) range to something the API and
 * the product accept: end <= today (the API happily fabricates future data),
 * window length within [7, 30]. Oversized windows keep their end and pull the
 * start forward; if clamping leaves fewer than 7 days there is no way to honor
 * the user's intent, so reset to the default range instead of inventing one.
 */
export function clampRange(start: string, end: string, today: string = todayISO()): DateRange {
	if (!isValidISODate(start) || !isValidISODate(end)) return defaultRange(today);
	const clampedEnd = diffDays(today, end) > 0 ? today : end;
	let clampedStart = start;
	if (diffDays(clampedStart, clampedEnd) < 0) return defaultRange(today);
	if (rangeLengthDays(clampedStart, clampedEnd) > MAX_WINDOW_DAYS) {
		clampedStart = addDays(clampedEnd, -(MAX_WINDOW_DAYS - 1));
	}
	if (rangeLengthDays(clampedStart, clampedEnd) < MIN_WINDOW_DAYS) return defaultRange(today);
	return { start: clampedStart, end: clampedEnd };
}
