import Papa from 'papaparse';

export type CsvCell = string | number;
export type CsvRow = Record<string, CsvCell>;

/** One platform's slice of the current view, exactly as rendered. */
export interface CsvSection {
	network: string;
	platform: string;
	periodStart: string;
	periodEnd: string;
	/**
	 * Daily rows with ISO `date` plus raw numeric metrics. Typed loosely (not
	 * Record<string, unknown>) so interface types like GoogleDaily — which have
	 * no index signature — are accepted as-is.
	 */
	rows: ReadonlyArray<{ date: string }>;
}

/**
 * ONE uniform daily-grain contract for every export (our resolution of the
 * underspecified CSV requirement): context columns first — network, platform,
 * periodStart, periodEnd, date — then the union of metric columns across all
 * sections, so multi-platform exports (dashboard = 4 platforms) stay
 * rectangular. Values are raw and unformatted: "$1,234" would import into
 * Excel/Sheets as text; ISO dates survive locale settings. A null rate or a
 * column another platform doesn't report becomes an empty cell.
 */
export function buildCsvRows(sections: readonly CsvSection[]): CsvRow[] {
	const metricColumns: string[] = [];
	for (const section of sections) {
		for (const row of section.rows) {
			for (const key of Object.keys(row)) {
				if (key !== 'date' && !metricColumns.includes(key)) metricColumns.push(key);
			}
		}
	}

	const out: CsvRow[] = [];
	for (const section of sections) {
		for (const row of section.rows) {
			const bag = row as Record<string, unknown>;
			const csvRow: CsvRow = {
				network: section.network,
				platform: section.platform,
				periodStart: section.periodStart,
				periodEnd: section.periodEnd,
				date: row.date,
			};
			for (const key of metricColumns) {
				const value = bag[key];
				csvRow[key] = typeof value === 'number' && Number.isFinite(value) ? value : '';
			}
			out.push(csvRow);
		}
	}
	return out;
}

/** e.g. eulerity_google_2026-06-26_2026-07-09.csv */
export function csvFilename(scope: string, periodStart: string, periodEnd: string): string {
	return `eulerity_${scope}_${periodStart}_${periodEnd}.csv`;
}

export function downloadCsv(rows: readonly CsvRow[], filename: string): void {
	const csv = Papa.unparse(rows as CsvRow[]);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	// WHY the delay: Safari cancels an in-flight download if its object URL is
	// revoked synchronously after click(). 10s is comfortably past commit.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
