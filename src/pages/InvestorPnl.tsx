import { useAccount, useReadContract } from 'wagmi';
import Page from '../components/Page';
import { InvestorPnlDiagram } from '../components/ProtocolDiagrams';

const FUND_ADDRESS = '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C';

const FUND_ABI = [
    {
        inputs: [],
        name: 'investorAccounting',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'navPerTokenUsdt6',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const ACCOUNTING_ABI = [
    {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'navPerTokenUsdt6', type: 'uint256' },
        ],
        name: 'getInvestorPnl',
        outputs: [{
            components: [
                { name: 'totalContributedAvax18', type: 'uint256' },
                { name: 'totalCostBasisUsdt6', type: 'uint256' },
                { name: 'remainingCostBasisUsdt6', type: 'uint256' },
                { name: 'directMintedTokens18', type: 'uint256' },
                { name: 'attributableTokens18', type: 'uint256' },
                { name: 'transferredInTokens18', type: 'uint256' },
                { name: 'transferredOutTokens18', type: 'uint256' },
                { name: 'currentAttributableValueUsdt6', type: 'uint256' },
                { name: 'realizedPnlUsdt6', type: 'int256' },
                { name: 'unrealizedPnlUsdt6', type: 'int256' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

function formatUsdt6(value?: bigint) {
    if (value === undefined) return '0.00';
    return (Number(value) / 1_000_000).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function InvestorPnl() {
    const { address } = useAccount();
    const { data: accountingModule } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'investorAccounting',
    });
    const { data: navPerTokenUsdt6 } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'navPerTokenUsdt6',
    });
    const { data } = useReadContract({
        address: accountingModule,
        abi: ACCOUNTING_ABI,
        functionName: 'getInvestorPnl',
        args: address && navPerTokenUsdt6 !== undefined ? [address, navPerTokenUsdt6] : undefined,
        query: { enabled: Boolean(address && accountingModule && navPerTokenUsdt6 !== undefined) },
    });

    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Methodology</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Wallet PnL</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The wallet view is meant to stay honest. Direct buys create basis. Transferred-in tokens still show up, but the site does not pretend it knows a cost basis it never actually observed.
                </p>
            </div>

            <section className="mt-16">
                <InvestorPnlDiagram />
            </section>

            <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
                {[
                    {
                        title: 'Realized PnL',
                        body: 'Updates when directly attributable tokens are redeemed against the live onchain view.',
                    },
                    {
                        title: 'Unrealized PnL',
                        body: 'Attributable balance multiplied by the current mark, minus the remaining direct basis tracked onchain.',
                    },
                    {
                        title: 'Transferred-in holdings',
                        body: 'Visible, but separated. The UI refuses to fake a tax lot it never watched come in.',
                    },
                ].map((card) => (
                    <div key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-white/60">{card.body}</p>
                    </div>
                ))}
            </section>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Connected wallet</div>
                <h2 className="mt-3 text-3xl font-bold text-white">Live view</h2>
                {!address ? (
                    <p className="mt-4 text-sm leading-7 text-white/55">
                        Connect a wallet to query the live module-backed wallet view directly from the upgraded Fuji proxy.
                    </p>
                ) : data ? (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            ['Direct basis', `$${formatUsdt6(data.totalCostBasisUsdt6)}`],
                            ['Remaining basis', `$${formatUsdt6(data.remainingCostBasisUsdt6)}`],
                            ['Current value', `$${formatUsdt6(data.currentAttributableValueUsdt6)}`],
                            ['Unrealized PnL', `$${formatUsdt6(BigInt(data.unrealizedPnlUsdt6 >= 0n ? data.unrealizedPnlUsdt6 : -data.unrealizedPnlUsdt6))}`],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</div>
                                <div className="mt-2 text-2xl font-black text-white">{value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm leading-7 text-white/55">
                        The wallet view is live on the upgraded Fuji stack now. If this panel is still empty, your connected wallet likely just does not have any directly observed CATCH basis on the current testnet deployment.
                    </p>
                )}
            </section>
        </Page>
    );
}
