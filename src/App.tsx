import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Fundraising from './pages/Fundraising';
import Footer from './components/Footer';

import HowItWorks from './pages/HowItWorks';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-[#0a0f1c] text-white">
                <Navbar />
                <div className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/how-it-works" element={<HowItWorks />} />
                        <Route path="/fundraising" element={<Fundraising />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
