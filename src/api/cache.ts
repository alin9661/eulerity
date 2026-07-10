// Snapshot cache: Map<key, Promise<payload>>.
//
// WHY no TTL: the API is deterministic per URL (verified — identical bytes on
// repeat fetches, SPEC.md §4.1), so a snapshot can never go stale within a
// session. Caching exists purely for request dedup, instant back/forward
// navigation, and one-extra-fetch ghost overlays.
//
// WHY the PROMISE is cached (not the resolved value): two components mounting
// in the same tick then share a single in-flight request instead of racing
// duplicate fetches.

const cache = new Map<string, Promise<unknown>>();

export function snapshotKey(endpoint: string, network = '', start = '', end = ''): string {
	return `${endpoint}|${network}|${start}|${end}`;
}

export function getSnapshot<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const cached = cache.get(key);
	if (cached) return cached as Promise<T>;

	const promise = fetcher();
	cache.set(key, promise);

	// WHY delete on rejection: a cached rejected promise would replay the same
	// error on every remount, turning the Retry button into a permanent no-op.
	// Evicting lets the next attempt issue a fresh fetch. The identity check
	// avoids clobbering a newer promise that may have replaced this one.
	promise.catch(() => {
		if (cache.get(key) === promise) cache.delete(key);
	});

	return promise;
}
