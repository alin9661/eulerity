/**
 * Design tokens — light theme only (dark mode deliberately not built, see README).
 * Contrast ratios machine-verified against WCAG (see PLAN "Product concept"):
 * inkMuted 5.98:1 on white; platform `base` >=3:1 vs white (chart marks),
 * platform `text` >=4.5:1 vs white (hues used as text).
 */

export interface PlatformHue {
	/** Chart-mark hue: >=3:1 vs white */
	base: string
	/** Darker variant safe for body-size text: >=4.5:1 vs white */
	text: string
}

export const theme = {
	colors: {
		bg: '#F6F7FB',
		surface: '#FFFFFF',
		ink: '#161B2C',
		inkMuted: '#5A6474',
		border: '#E4E7EF',
		/** Subtle fill for tracks, hover states, weekend bands */
		fill: '#EBEDF4',
		accentFrom: '#3B6CF6',
		accentTo: '#8B5CF6',
		delta: {
			favorable: { fg: '#116B45', bg: '#E3F4EB' },
			unfavorable: { fg: '#B42318', bg: '#FDEBE9' },
			/** Designed-neutral slate — spend carries no valence (PLAN ambiguity #1) */
			neutral: { fg: '#454C5E', bg: '#EBEDF4' },
		},
	},
	/** Brand gradient is strictly an accent (buttons, active nav, chart fills) — never a page background */
	gradient: {
		accent: 'linear-gradient(135deg, #3B6CF6 0%, #8B5CF6 100%)',
	},
	platforms: {
		facebook: { base: '#1877F2', text: '#0B5CC4' },
		instagram: { base: '#D6317E', text: '#AD1663' },
		google: { base: '#C77E00', text: '#8A5800' },
		linkedin: { base: '#0A66C2', text: '#0A66C2' },
	} satisfies Record<string, PlatformHue>,
	space: (n: number) => `${n * 4}px`,
	/** Type ramp — roles documented in DESIGN.md §Typography */
	type: {
		caption: '12px',
		label: '13px',
		body: '15px',
		section: '18px',
		title: '24px',
		kpi: '32px',
	},
	/** Minimal-functional motion; global reduced-motion kill switch zeroes all of these */
	motion: {
		micro: '120ms',
		short: '180ms',
		medium: '240ms',
		enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
		exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
	},
	layout: {
		sidebarWidth: '232px',
		contentMax: '1280px',
	},
	radii: {
		sm: '8px',
		md: '12px',
		lg: '16px',
		pill: '999px',
	},
	shadows: {
		soft: '0 1px 2px rgba(22, 27, 44, 0.04), 0 8px 24px rgba(22, 27, 44, 0.06)',
		raised: '0 2px 4px rgba(22, 27, 44, 0.06), 0 12px 32px rgba(22, 27, 44, 0.10)',
	},
	breakpoints: {
		sm: '640px',
		lg: '1024px',
	},
	font: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const

export type AppTheme = typeof theme
export type PlatformKey = keyof typeof theme.platforms
