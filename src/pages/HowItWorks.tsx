import { Link } from 'react-router-dom';

export default function HowItWorks() {
    const steps = [
        {
            title: "1. Acquire $CATCH",
            description: "Buy the $CATCH token directly onchain. The token represents your exposure to the performance of the graded card market.",
            icon: "💎"
        },
        {
            title: "2. Portfolio Growth",
            description: "The treasury uses funds to acquire high-grade graded cards (PSA/BGS 10s). As the market value of these cards fluctuates, the backing of the token adjusts.",
            icon: "📈"
        },
        {
            title: "3. Governance",
            description: "Token holders can vote on key decisions, including which cards to acquire or sell, ensuring community-driven management of the portfolio.",
            icon: "🗳️"
        },
        {
            title: "4. Liquidity & Exit",
            description: "You can sell your $CATCH tokens back to the pool at any time, allowing for 24/7 liquidity without waiting for buyers.",
            icon: "💧"
        }
    ];

    return (
        <div className="min-h-screen pt-32 px-4 pb-20 bg-[#0a0f1c] text-white">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        How <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Gem Mint Strategy</span> Works
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        A transparent, onchain approach to gaining exposure to the graded card market.
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
                            Join the community and start building your exposure to the graded card market today.
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
            </div>
        </div>
    );
}
