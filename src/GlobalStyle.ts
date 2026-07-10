import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
	*, *::before, *::after {
		box-sizing: border-box;
		margin: 0;
	}

	html {
		-webkit-text-size-adjust: 100%;
	}

	body {
		background: ${({ theme }) => theme.colors.bg};
		color: ${({ theme }) => theme.colors.ink};
		font-family: ${({ theme }) => theme.font};
		font-size: 15px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	img, svg, canvas {
		display: block;
		max-width: 100%;
	}

	button, input, select, textarea {
		font: inherit;
		color: inherit;
	}

	button {
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	h1, h2, h3, h4 {
		line-height: 1.2;
		font-weight: 700;
	}

	:focus-visible {
		outline: 2px solid ${({ theme }) => theme.colors.accentFrom};
		outline-offset: 2px;
		border-radius: ${({ theme }) => theme.radii.sm};
	}

	/* Every numeric readout aligns digit columns (KPIs, tables, tooltips) */
	.tnum {
		font-variant-numeric: tabular-nums;
	}

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after {
			animation-duration: 0s !important;
			animation-delay: 0s !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0s !important;
			transition-delay: 0s !important;
			scroll-behavior: auto !important;
		}
	}
`
