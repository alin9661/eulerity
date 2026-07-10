import { useEffect, useRef, useState } from 'react';
import { getSnapshot, snapshotKey } from '../api/cache';
import { ApiError, getInsights, getSummary } from '../api/client';
import type {
	GoogleInsights,
	InsightsResponse,
	LinkedInInsights,
	MetaInsights,
	Network,
	SummaryResponse,
} from '../api/types';

export type QueryState<T> =
	| { status: 'loading' }
	| { status: 'error'; error: ApiError; retry: () => void }
	| { status: 'success'; data: T };

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;
	return new ApiError('NETWORK', error instanceof Error ? error.message : 'Request failed.');
}

/**
 * Subscribe to one cached snapshot. Retry re-runs the fetch (the cache evicts
 * rejected promises, so it really refetches instead of replaying the error).
 */
export function useQuerySnapshot<T>(key: string, fetcher: () => Promise<T>): QueryState<T> {
	const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
	const [attempt, setAttempt] = useState(0);

	// Latest-ref: the effect must re-run on key/attempt changes only; an inline
	// fetcher closure (new identity every render) must not retrigger it.
	const fetcherRef = useRef(fetcher);
	fetcherRef.current = fetcher;

	// Reset synchronously during render when the key changes, so the previous
	// snapshot never paints even one stale frame under the new key.
	const [renderedKey, setRenderedKey] = useState(key);
	if (renderedKey !== key) {
		setRenderedKey(key);
		setState({ status: 'loading' });
	}

	// STALE-RACE TRAP: with rapid range changes, an older fetch can settle AFTER
	// a newer one. The generation token is the ONLY guard on applying a result —
	// every settlement must prove it belongs to the latest effect run.
	//
	// WHY no AbortController: the fetch is shared through the snapshot cache, so
	// aborting it on one consumer's cleanup would poison it for every other
	// consumer — including StrictMode's second mount, which is exactly why the
	// app errored with "signal is aborted" on first load. The generation token
	// already discards stale/unmounted settlements, and responses are tiny and
	// deterministically cached, so letting a spare request finish is free.
	const generationRef = useRef(0);

	useEffect(() => {
		const generation = ++generationRef.current;

		fetcherRef.current().then(
			(data) => {
				if (generationRef.current === generation) setState({ status: 'success', data });
			},
			(error: unknown) => {
				if (generationRef.current !== generation) return;
				setState({
					status: 'error',
					error: toApiError(error),
					retry: () => setAttempt((n) => n + 1),
				});
			},
		);
	}, [key, attempt]);

	return state;
}

export function useSummary(): QueryState<SummaryResponse> {
	const key = snapshotKey('metrics-summary');
	return useQuerySnapshot(key, () => getSnapshot(key, () => getSummary()));
}

export function useInsights(network: 'google', start: string, end: string): QueryState<GoogleInsights>;
export function useInsights(network: 'linkedin', start: string, end: string): QueryState<LinkedInInsights>;
export function useInsights(network: 'meta', start: string, end: string): QueryState<MetaInsights>;
export function useInsights(network: Network, start: string, end: string): QueryState<InsightsResponse>;
export function useInsights(network: Network, start: string, end: string): QueryState<InsightsResponse> {
	const key = snapshotKey('metrics-insights', network, start, end);
	return useQuerySnapshot<InsightsResponse>(key, () =>
		getSnapshot(key, () => getInsights(network, start, end)),
	);
}
