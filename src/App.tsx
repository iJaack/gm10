import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Fundraising from './pages/Fundraising';
import Footer from './components/Footer';
import HowItWorks from './pages/HowItWorks';
import FAQ from './pages/FAQ';
import Tokenomics from './pages/Tokenomics';
import Governance from './pages/Governance';
import Portfolio from './pages/Portfolio';
import NotFound from './pages/NotFound';
import TokenGate from './components/TokenGate';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-[#0a0f1c] text-white">
                <Navbar />
                <div className="flex-grow">
                    <Routes>
                        {/* Public pages — no gate */}
                        <Route path="/" element={<Home />} />
                        <Route path="/how-it-works" element={<HowItWorks />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/tokenomics" element={<Tokenomics />} />
                        <Route path="/governance" element={<Governance />} />
                        <Route path="/portfolio" element={<Portfolio />} />

                        {/* Buy page — requires 10M $EVA on Avalanche mainnet */}
                        <Route path="/fundraising" element={<TokenGate><Fundraising /></TokenGate>} />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
