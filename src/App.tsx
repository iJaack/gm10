import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Footer from './components/Footer';
import { ThemeContext, useThemeProvider } from './hooks/useTheme';

const Fundraising = lazy(() => import('./pages/Fundraising'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Holders = lazy(() => import('./pages/Holders'));
const Catch = lazy(() => import('./pages/Catch'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
    const themeValue = useThemeProvider();

    return (
        <ThemeContext.Provider value={themeValue}>
            <Router>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
                    <Navbar />
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
                    <Footer />
                </div>
            </Router>
        </ThemeContext.Provider>
    );
}

export default App;
