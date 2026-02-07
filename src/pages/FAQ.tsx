import Page from '../components/Page';

export default function FAQ() {
    const faqs = [
        {
            question: "What happens if the card market crashes?",
            answer: "NAV would decrease proportionally. However, we focus on iconic, historically resilient cards that maintain value long-term. The fund's diversification across multiple cards and grading companies helps mitigate individual card risk."
        },
        {
            question: "Can the team rug pull the liquidity?",
            answer: "No. LP tokens are burned to the dead address (0x...dEaD). It's mathematically impossible to remove liquidity. This is verifiable onchain and proves our long-term commitment."
        },
        {
            question: "How often is NAV updated?",
            answer: "Oracle updates NAV whenever significant market movements occur, with a minimum of monthly updates. All NAV changes are transparent and verifiable onchain."
        },
        {
            question: "Can I redeem my $CATCH for AVAX?",
            answer: "Yes, when redemptions are enabled by governance. You can also always sell on Trader Joe DEX for instant liquidity at market price."
        },
        {
            question: "What if cards are stolen or damaged?",
            answer: "Cards are insured and stored in professional vaults with comprehensive coverage. We work with industry-leading vault providers who specialize in high-value collectibles."
        },
        {
            question: "Is this a security token?",
            answer: "Legal analysis ongoing. We believe $CATCH is a utility token providing exposure to collectible assets, but you should consult your own legal counsel regarding regulatory classification."
        },
        {
            question: "What are the fees?",
            answer: "1% annual management fee on AUM and 10% performance fee on profits above high-water mark. Fees are used for operations, card acquisitions, and team compensation."
        },
        {
            question: "How do I vote on proposals?",
            answer: "Hold at least 10,000 $CATCH to submit proposals. Vote weight is proportional to your holdings. Voting is onchain with a 3-day period and 10% quorum. Approved proposals are executed automatically by the Timelock."
        }
    ];

    return (
        <Page containerClassName="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Frequently Asked <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Questions</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Everything you need to know about Gem Mint Strategy and the $CATCH token.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <details key={index} className="group bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all duration-300">
                            <summary className="flex items-center justify-between cursor-pointer list-none">
                                <h3 className="text-xl font-bold text-white pr-4">{faq.question}</h3>
                                <span className="text-2xl text-blue-400 group-open:rotate-180 transition-transform duration-300">↓</span>
                            </summary>
                            <p className="mt-4 text-gray-400 leading-relaxed text-lg border-t border-white/10 pt-4">
                                {faq.answer}
                            </p>
                        </details>
                    ))}
                </div>

                <div className="mt-16 text-center bg-blue-900/20 border border-blue-500/30 rounded-3xl p-12">
                    <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
                    <p className="text-xl text-gray-300 mb-6">
                        Reach out to us on Twitter or join our community.
                    </p>
                    <a
                        href="https://twitter.com/GemMintStrategy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all duration-300"
                    >
                        Follow us on Twitter →
                    </a>
                </div>
        </Page>
    );
}
