import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import NavbarV2 from './components/v2/NavbarV2';
import FooterV2 from './components/v2/FooterV2';
import SmoothScroll from './components/v2/SmoothScroll';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/HomeV2';
import { ThemeContext, useThemeProvider } from './hooks/useTheme';

const Fundraising = lazy(() => import('./pages/FundraisingV2'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Portfolio = lazy(() => import('./pages/PortfolioV2'));
const Holders = lazy(() => import('./pages/HoldersV2'));
const Catch = lazy(() => import('./pages/Catch'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
    const themeValue = useThemeProvider();

    return (
        <ThemeContext.Provider value={themeValue}>
            <Router>
                <SmoothScroll />
                <ScrollToTop />
                <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
                    <NavbarV2 />
                    <div className="flex-grow">
                        <Suspense fallback={<main className="px-4 py-24" />}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/fundraising" element={<Fundraising />} />
                                <Route path="/portfolio" element={<Portfolio />} />
                                <Route path="/holders" element={<Holders />} />
                                <Route path="/faq" element={<FAQ />} />
                                <Route path="/catch" element={<Catch />} />
                                <Route path="/testnet-status" element={<Navigate to="/fundraising#proof" replace />} />
                                <Route path="/proof" element={<Navigate to="/fundraising#proof" replace />} />
                                <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
                                <Route path="/tokenomics" element={<Navigate to="/catch" replace />} />
                                <Route path="/governance" element={<Navigate to="/#governance" replace />} />
                                <Route path="/nav-methodology" element={<Navigate to="/#pricing" replace />} />
                                <Route path="/sales-proceeds" element={<Navigate to="/#exits" replace />} />
                                <Route path="/investor-pnl" element={<Navigate to="/holders" replace />} />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </div>
                    <FooterV2 />
                </div>
                <Analytics />
            </Router>
        </ThemeContext.Provider>
    );
}

export default App;
