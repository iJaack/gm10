import { Link } from 'react-router-dom';
import Page from '../components/Page';

export default function HowItWorks() {
    const steps = [
        {
            title: "1. Acquire $CATCH",
            description: "Buy the $CATCH token during fundraising rounds. Each token grants membership in the collector community and participation in a portfolio of high-graded Pokemon cards.",
            icon: "💎"
        },
        {
            title: "2. Portfolio Growth",
            description: "The treasury acquires premium graded cards as NFTs from platforms like Courtyard, Phygital, or Collector Crypt. Physical cards may also be purchased and tokenized.",
            icon: "📈"
        },
        {
            title: "3. Governance",
            description: "Token holders vote on acquisitions, sales, and fund strategy. Minimum 10,000 $CATCH to submit proposals. 3-day voting periods with 10% quorum. Your voice shapes the portfolio direction.",
            icon: "🗳️"
        },
        {
            title: "4. Redeem or Transfer",
            description: "Redeem $CATCH directly from the protocol (when enabled by governance) or transfer tokens to another holder. LP tokens are permanently burned. Liquidity decisions are governed by token holders.",
            icon: "💧"
        }
    ];

    return (
        <Page containerClassName="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                    How <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Gem Mint Strategy</span> Works
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    A transparent, onchain approach to participating in the graded card collector market.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {steps.map((step, index) => (
                    <div key={index} className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_0_30px_rgba(56,189,248,0.05)]">
                        <div className="text-4xl mb-4">{step.icon}</div>
                        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            {step.description}
                        </p>
                    </div>
                ))}
            </div>

            <div className="text-center bg-blue-900/20 border border-blue-500/30 rounded-3xl p-12 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
                        Join the community and start building your graded card collection onchain today.
                    </p>
                    <Link
                        to="/fundraising"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all duration-300"
                    >
                        Buy $CATCH
                    </Link>
                </div>
                {/* Decorative background blur */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/20 blur-[100px] rounded-full" />
            </div>
        </Page>
    );
}
