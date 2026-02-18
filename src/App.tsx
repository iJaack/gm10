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
                        {/* Homepage is public */}
                        <Route path="/" element={<Home />} />

                        {/* All other pages require 10M $EVA */}
                        <Route path="/how-it-works" element={<TokenGate><HowItWorks /></TokenGate>} />
                        <Route path="/faq" element={<TokenGate><FAQ /></TokenGate>} />
                        <Route path="/tokenomics" element={<TokenGate><Tokenomics /></TokenGate>} />
                        <Route path="/governance" element={<TokenGate><Governance /></TokenGate>} />
                        <Route path="/portfolio" element={<TokenGate><Portfolio /></TokenGate>} />

                        {/* Fundraising requires staking 10M $EVA */}
                        <Route path="/fundraising" element={<TokenGate requireInvest><Fundraising /></TokenGate>} />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
