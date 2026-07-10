import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import styled, { ThemeProvider } from 'styled-components'
import { GlobalStyle } from './GlobalStyle'
import { Sidebar } from './components/Sidebar'
import { theme } from './theme'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NetworkPage = lazy(() => import('./pages/NetworkPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const Shell = styled.div`
	display: flex;
	flex-direction: column;
	min-height: 100dvh;

	@media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
		flex-direction: row;
	}
`

const Main = styled.main`
	flex: 1;
	min-width: 0; /* charts inside flex must be allowed to shrink (375px pass) */
	padding: ${({ theme }) => theme.space(4)};

	@media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
		padding: ${({ theme }) => theme.space(8)};
	}
`

const LoadingBlock = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	color: ${({ theme }) => theme.colors.inkMuted};
	font-size: 14px;
	font-weight: 600;
`

export default function App() {
	return (
		<ThemeProvider theme={theme}>
			<GlobalStyle />
			<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
				<Shell>
					<Sidebar />
					<Main>
						<Suspense fallback={<LoadingBlock role="status">Loading…</LoadingBlock>}>
							<Routes>
								<Route path="/" element={<DashboardPage />} />
								<Route path="/network/:networkId" element={<NetworkPage />} />
								<Route path="*" element={<NotFoundPage />} />
							</Routes>
						</Suspense>
					</Main>
				</Shell>
			</BrowserRouter>
		</ThemeProvider>
	)
}
