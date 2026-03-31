import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Fundraising from './pages/Fundraising';
import Footer from './components/Footer';
import FAQ from './pages/FAQ';
import Portfolio from './pages/Portfolio';
import NotFound from './pages/NotFound';

function App() {
    return (
        <Router>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-[#0a0f1c] text-white">
                <Navbar />
                <div className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/fundraising" element={<Fundraising />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/testnet-status" element={<Navigate to="/fundraising#proof" replace />} />
                        <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
                        <Route path="/tokenomics" element={<Navigate to="/#token" replace />} />
                        <Route path="/governance" element={<Navigate to="/#governance" replace />} />
                        <Route path="/nav-methodology" element={<Navigate to="/#pricing" replace />} />
                        <Route path="/sales-proceeds" element={<Navigate to="/#exits" replace />} />
                        <Route path="/investor-pnl" element={<Navigate to="/#wallet" replace />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
