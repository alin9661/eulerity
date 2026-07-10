import type { PlatformKey } from './theme'

export type NetworkId = 'meta' | 'google' | 'linkedin'

export interface NetworkConfig {
	id: NetworkId
	label: string
	/** Which platform hue token(s) this network's marks draw from */
	hues: readonly PlatformKey[]
	/**
	 * Metric ids (METRIC_REGISTRY keys) rendered in the KPI header, in order.
	 * Rates are always recomputed from summed bases where the API omits them
	 * (SPEC rate-field rule) — never summed or averaged from daily rates.
	 */
	headerMetrics: readonly string[]
	extras: {
		/** LinkedIn weekends ≈7% of weekday volume — shade them as expected pattern, not a bug */
		weekendBands?: boolean
		/** Meta has no combined rollup — Combined | Facebook | Instagram segmented control */
		platformToggle?: boolean
		/** Secondary KPI row of social engagement metrics (likes/comments/shares/follows) */
		socialRow?: boolean
	}
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
	meta: {
		id: 'meta',
		label: 'Meta',
		hues: ['facebook', 'instagram'],
		// ctr is recomputed client-side for the Combined view (sum clicks / sum impressions);
		// engagement = shared fields only (likes + comments) — shares/saves are per-platform
		headerMetrics: ['spend', 'conversions', 'ctr', 'engagement'],
		extras: { platformToggle: true },
	},
	google: {
		id: 'google',
		label: 'Google',
		hues: ['google'],
		// costPerConversion is API-native only on google rows/totals
		headerMetrics: ['spend', 'conversions', 'cpc', 'costPerConversion'],
		extras: {},
	},
	linkedin: {
		id: 'linkedin',
		label: 'LinkedIn',
		hues: ['linkedin'],
		headerMetrics: ['spend', 'conversions', 'ctr', 'cpm'],
		extras: { weekendBands: true, socialRow: true },
	},
}

export const NETWORK_LIST: readonly NetworkConfig[] = [
	NETWORKS.meta,
	NETWORKS.google,
	NETWORKS.linkedin,
]

export function isNetworkId(value: string | undefined): value is NetworkId {
	return value === 'meta' || value === 'google' || value === 'linkedin'
}
