import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { BUY_PAGE_DEFAULTS, ROUND_PROCEEDS_ALLOCATION } from './data/protocol';

const wagmiMocks = vi.hoisted(() => ({
    account: {
        address: undefined as `0x${string}` | undefined,
        isConnected: false,
    },
    balanceValue: undefined as bigint | undefined,
    roundState: undefined as any,
    reset: vi.fn(),
    writeContract: vi.fn(),
}));

vi.mock('@rainbow-me/rainbowkit', () => {
    const ConnectButton = Object.assign(
        () => <button type="button">Connect Wallet</button>,
        {
            Custom: ({ children }: { children: any }) =>
                children({ openConnectModal: () => undefined }),
        },
    );

    return { ConnectButton };
});

vi.mock('./components/Web3Providers', () => ({
    Web3Providers: ({ children }: { children: any }) => <>{children}</>,
}));

vi.mock('wagmi', () => ({
    useAccount: () => wagmiMocks.account,
    useBalance: () => ({
        data: wagmiMocks.balanceValue === undefined ? undefined : { value: wagmiMocks.balanceValue },
    }),
    useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
    useWriteContract: () => ({
        data: undefined,
        error: undefined,
        isPending: false,
        reset: wagmiMocks.reset,
        writeContract: wagmiMocks.writeContract,
    }),
}));

vi.mock('./components/ProtocolDiagrams', () => ({
    FundLifecycleDiagram: () => <div>Fund lifecycle diagram</div>,
    InvestorPnlDiagram: () => <div>Wallet diagram</div>,
    NavDecisionDiagram: () => <div>NAV diagram</div>,
    ProfitWaterfallDiagram: () => <div>Waterfall diagram</div>,
    SaleLifecycleDiagram: () => <div>Sale lifecycle diagram</div>,
    TokenAllocationDiagram: () => <div>Token allocation diagram</div>,
}));

vi.mock('./hooks/useFujiProof', () => ({
    useFujiContracts: () => ({
        proxyAddress: '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
        portfolioRegistryAddress: '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
        investorAccountingAddress: '0x526a0DeBfEF61966060342C2b12ae0325cffA210',
        links: [
            {
                label: 'Fund proxy',
                address: '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
            },
            {
                label: 'Portfolio registry',
                address: '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
            },
            {
                label: 'Wallet accounting',
                address: '0x526a0DeBfEF61966060342C2b12ae0325cffA210',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0x526a0DeBfEF61966060342C2b12ae0325cffA210',
            },
        ],
    }),
    useFujiRoundState: () => wagmiMocks.roundState ?? ({
        roundId: 2,
        round: {
            targetAmount: 5000000000000000000000n,
            raisedAmount: 4999999600000000000000n,
            tokenPrice: 3500000000000000n,
            minInvestment: 100000000000000000n,
            maxInvestment: 500000000000000000000n,
            startTime: 1776351600n,
            endTime: 1778943600n,
            isActive: true,
            isFinalized: false,
        },
        status: 'Open',
        progress: 99.999992,
        isRoundOpen: true,
        isUpcoming: false,
        isClosed: false,
        isPlanned: false,
        roundSource: 'onchain',
        startsAt: 1776351600,
        endsAt: 1778943600,
        archiveRound: {
            roundId: 1n,
            targetAmount: 500000000000000000000n,
            raisedAmount: 500000000000000000000n,
            tokenPrice: 3000000000000000n,
            minInvestment: 100000000000000000n,
            maxInvestment: 200000000000000000000n,
            startTime: 1776110400n,
            endTime: 1777051200n,
            isActive: false,
            isFinalized: true,
        },
        targetLabel: '5,000 AVAX',
        raisedLabel: '4,999.9996 AVAX',
        priceLabel: '0.0035 AVAX',
        minMaxLabel: '0.1 to 500 AVAX',
        links: [
            {
                label: 'Fund proxy',
                address: '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
            },
            {
                label: 'Portfolio registry',
                address: '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
            },
            {
                label: 'Wallet accounting',
                address: '0x526a0DeBfEF61966060342C2b12ae0325cffA210',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0x526a0DeBfEF61966060342C2b12ae0325cffA210',
            },
        ],
    }),
    useFujiPortfolioPositions: () => ({
        proxyAddress: '0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9',
        portfolioRegistryAddress: '0x79678b78f7c2b8099bBd18d6754891774632F8F4',
        investorAccountingAddress: '0x99EdFdF5785EE56A1E126ee72ee3D9694c262a91',
        links: [
            {
                label: 'Fund proxy',
                address: '0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9',
            },
        ],
        collectiblePositionCount: 2,
        positions: [
            {
                positionId: 1,
                title: 'Gengar VMAX',
                subtitle: 'PSA 10',
                imageSrc: '/brand/cover-pokeball-night.webp',
                imageAlt: 'Gengar card',
                note: 'Recorded card',
                acquisition: '$18.00',
                currentValue: '$18.00',
                lastNavMark: '$18.00',
                chain: 'Avalanche Fuji',
                tokenId: '1',
                collectionAddress: '0xA2Abe7905b185949c5dBefEb86C1D0F5492E74fF',
                collectionLabel: '0xA2...74fF',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xA2Abe7905b185949c5dBefEb86C1D0F5492E74fF',
                acquisitionDateLabel: 'Apr 15, 2026',
                lastValuationLabel: 'Apr 15, 2026',
                statusLabel: 'Active',
            },
            {
                positionId: 2,
                title: 'Recorded card #2',
                subtitle: 'Metadata pending',
                imageSrc: '/brand/cover-pokeball-night.webp',
                imageAlt: 'GM10 card',
                acquisition: '$22.00',
                currentValue: '$22.00',
                lastNavMark: '$22.00',
                chain: 'Avalanche Fuji',
                tokenId: '1',
                collectionAddress: '0x05F9188eD398D7dA979861617eBA59d7B1DEeA66',
                collectionLabel: '0x05...eA66',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0x05F9188eD398D7dA979861617eBA59d7B1DEeA66',
                acquisitionDateLabel: 'Apr 15, 2026',
                lastValuationLabel: 'Apr 15, 2026',
                statusLabel: 'Active',
            },
        ],
        activity: [
            { id: 'buy-1', type: 'Buy', item: 'Gengar VMAX', date: 'Apr 15, 2026', amount: '$18.00', detail: 'Avalanche Fuji position #1' },
            { id: 'buy-2', type: 'Buy', item: 'Recorded card #2', date: 'Apr 15, 2026', amount: '$22.00', detail: 'Avalanche Fuji position #2' },
        ],
        proofSummary: {
            holdingsLabel: '2 recorded positions',
            holdingsChipLabel: '2 acquired cards',
            costBasisLabel: '$40.00',
            onchainCurrentMarkLabel: '$40.00',
            platformNavLabel: '$44.00',
            unrealizedPnlLabel: '$4.00',
            unrealizedPnlPercentLabel: '+10.0%',
            unrealizedPnlDirection: 'up',
            unrealizedSourceLabel: 'Courtyard profile NAV',
            portfolioValueLabel: '$40.00',
            liquidTreasuryLabel: '$10.00',
            referenceNavLabel: '$0.02',
        },
    }),
}));

vi.mock('./hooks/useCourtyardProfileNav', () => ({
    useCourtyardProfileNav: () => ({
        source: 'courtyard',
        netWorthUsd: 44,
        fetchedAt: '2026-04-15T22:00:00.000Z',
        profileUrl: 'https://courtyard.io/user/gm10xyz/collection',
        status: 'available',
        isLoading: false,
    }),
}));

vi.mock('./hooks/useHolderDashboard', () => ({
    useHolderDashboard: () => ({
        isConnected: false,
        claimState: {
            canClaim: false,
            reason: 'Connect a wallet to check realized profit.',
        },
        labels: {
            totalSupply: '183,333.3333 CATCH',
            profitEligibleSupply: '174,421.1693 CATCH',
            referenceNav: '$0.02',
            navPerToken: '$0.02',
            catchBalance: 'Connect wallet',
            remainingCostBasis: 'Connect wallet',
            currentReferenceValue: 'Connect wallet',
            unrealizedReferencePnl: 'Connect wallet',
            claimableProfit: 'Connect wallet',
            claimedProfit: 'Connect wallet',
            totalProfitDeposited: '0 AVAX',
            holderProfitsClaimableClaimed: '$0.00',
            holderProfitApr: 'APR unavailable',
            liquidTreasury: '$3,528.60',
            holderDistributionAccrued: '$0.00',
            liquidityCatchBuyAccrued: '$0.00',
            liquidityAvaxPairingAccrued: '$0.00',
        },
        raw: {
            referenceNav: 20000n,
            navPerToken: 20000n,
        },
    }),
}));

vi.mock('./hooks/useCatchMarketData', () => ({
    useCatchMarketData: () => ({
        status: 'available',
        spotPriceUsd: 0.022,
        fetchedAt: '2026-04-15T22:00:00.000Z',
        lfj: {
            venue: 'LFJ',
            status: 'available',
            pairAddress: '0x1111111111111111111111111111111111111111',
            quoteToken: 'AVAX',
            priceUsd: 0.022,
            liquidityUsd: 10000,
            volume24hUsd: 500,
            priceChange24h: 1.2,
            url: 'https://lfj.gg',
        },
        pharaoh: {
            venue: 'Pharaoh',
            status: 'unavailable',
            fallbackAvax: 1n,
            fallbackCatch: 1000000000000000000n,
        },
    }),
}));

function renderAt(path: string) {
    window.history.pushState({}, '', path);
    return render(<App />);
}

afterEach(() => {
    cleanup();
    wagmiMocks.account = { address: undefined, isConnected: false };
    wagmiMocks.balanceValue = undefined;
    wagmiMocks.roundState = undefined;
    wagmiMocks.reset.mockClear();
    wagmiMocks.writeContract.mockClear();
    window.history.pushState({}, '', '/');
});

describe('route simplification', () => {
    it('shows the public routes in the desktop nav', () => {
        const { container } = renderAt('/');
        const desktopNav = container.querySelector('header nav');

        expect(desktopNav).not.toBeNull();
        const labels = Array.from(desktopNav!.querySelectorAll('a')).map((link) =>
            link.textContent?.replace(/^[↗►]/, '').trim(),
        );

        expect(labels).toEqual(['Join', 'How It Works', 'Portfolio', 'Holders', 'FAQ']);
    });

    it.each([
        ['/testnet-status', '/fundraising#proof'],
        ['/how-it-works', '/#how-it-works'],
        ['/tokenomics', '/catch'],
        ['/governance', '/#governance'],
        ['/nav-methodology', '/#pricing'],
        ['/sales-proceeds', '/#exits'],
        ['/investor-pnl', '/holders'],
    ])('redirects %s to %s', async (from, to) => {
        renderAt(from);

        await waitFor(() => {
            expect(`${window.location.pathname}${window.location.hash}`).toBe(to);
        });
    });
});

describe('page compression regressions', () => {
    it('keeps the home page focused on proxy access to elite pokemon-card upside', () => {
        renderAt('/');

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/trophy-grade pokémon cards/i);
        expect(screen.getAllByText(/trophy-grade/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/GM10 turns sourcing, diligence, custody, valuation, and exits/i)).toBeInTheDocument();
        expect(screen.getByText(/the thesis/i)).toBeInTheDocument();
        expect(screen.getByText(/record public sale/i)).toBeInTheDocument();
        expect(screen.getByText(/the track record/i)).toBeInTheDocument();
        expect(screen.getByText(/current holdings/i)).toBeInTheDocument();
        expect(screen.getAllByText(/round 2 .* live/i).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /join round|join the round/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /top-grade pokémon cards have compounded/i })).toBeInTheDocument();
        expect(screen.getByText(/\$16\.5M/i)).toBeInTheDocument();
    });

    it('merges buy and live proof into the fundraising route', async () => {
        renderAt('/fundraising');

        expect(await screen.findByRole('heading', { name: /round 02/i })).toBeInTheDocument();
        expect(screen.queryByText(/you're not buying one card/i)).not.toBeInTheDocument();
        expect(screen.getByText(/^target$/i)).toBeInTheDocument();
        expect(screen.getByText(/^price$/i)).toBeInTheDocument();
        expect(screen.getByText(/^window$/i)).toBeInTheDocument();
        expect(screen.getByText(/^trading terminal$/i)).toBeInTheDocument();
        expect(screen.getByText(/wallet disconnected/i)).toBeInTheDocument();
        expect(screen.getByText(/how the 5,000 avax raised so far will split/i)).toBeInTheDocument();
        expect(screen.getAllByText(/4,250 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/500 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/250 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /round 1 closed early/i })).toBeInTheDocument();
        expect(screen.queryByText(/round 1 complete/i)).not.toBeInTheDocument();
        expect(screen.getByText(/proof surface/i)).toBeInTheDocument();
        expect(screen.getByText(/fund proxy/i)).toBeInTheDocument();
        expect(screen.getByText(/portfolio registry/i)).toBeInTheDocument();
        expect(screen.getByText(/wallet accounting/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /connect wallet/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
    });

    it('shows planned round 2 setup as in progress during the configured window', async () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                roundId: 2n,
                targetAmount: 5000000000000000000000n,
                raisedAmount: 0n,
                tokenPrice: 3500000000000000n,
                minInvestment: 100000000000000000n,
                maxInvestment: 500000000000000000000n,
                startTime: 1776351600n,
                endTime: 1778943600n,
                isActive: false,
                isFinalized: false,
            },
            status: 'Round 2 setup in progress',
            progress: 0,
            isRoundOpen: false,
            isUpcoming: false,
            isClosed: false,
            isPlanned: true,
            roundSource: 'planned',
            startsAt: 1776351600,
            endsAt: 1778943600,
            archiveRound: undefined,
            targetLabel: '5,000 AVAX',
            raisedLabel: '0 AVAX',
            priceLabel: '0.0035 AVAX',
            minMaxLabel: '0.1 to 500 AVAX',
            links: [],
        };

        renderAt('/fundraising');

        expect((await screen.findAllByText(/round 2 setup in progress/i)).length).toBeGreaterThan(0);
        expect(screen.getByText(/setup in progress\./i)).toBeInTheDocument();
        expect(screen.queryByText(/^closed\.$/i)).not.toBeInTheDocument();
    });

    it('preflights round 2 buys against the exact remaining cap before submitting', async () => {
        wagmiMocks.account = {
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        };
        wagmiMocks.balanceValue = 10n * 10n ** 18n;
        renderAt('/fundraising');

        const amountInput = await screen.findByPlaceholderText('0.00');
        fireEvent.change(amountInput, { target: { value: '0.1' } });
        fireEvent.click(screen.getByRole('button', { name: /commit now/i }));

        expect(wagmiMocks.writeContract).not.toHaveBeenCalled();
        expect(screen.getByText(/only 0\.0004 AVAX remains/i)).toBeInTheDocument();
    });

    it('submits the round 2 buy when the amount exactly closes the remaining cap', async () => {
        wagmiMocks.account = {
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        };
        wagmiMocks.balanceValue = 10n * 10n ** 18n;
        renderAt('/fundraising');

        const amountInput = await screen.findByPlaceholderText('0.00');
        fireEvent.change(amountInput, { target: { value: '0.0004' } });
        fireEvent.click(screen.getByRole('button', { name: /commit now/i }));

        expect(wagmiMocks.writeContract).toHaveBeenCalledTimes(1);
        expect(wagmiMocks.writeContract).toHaveBeenCalledWith(expect.objectContaining({
            functionName: 'invest',
            args: [2n],
            value: 400000000000000n,
        }));
    });

    it('normalizes the validated round 2 amount before submitting', async () => {
        wagmiMocks.account = {
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        };
        wagmiMocks.balanceValue = 10n * 10n ** 18n;
        renderAt('/fundraising');

        const amountInput = await screen.findByPlaceholderText('0.00');
        fireEvent.change(amountInput, { target: { value: '4e-4' } });
        fireEvent.click(screen.getByRole('button', { name: /commit now/i }));

        expect(wagmiMocks.writeContract).toHaveBeenCalledTimes(1);
        expect(wagmiMocks.writeContract).toHaveBeenCalledWith(expect.objectContaining({
            functionName: 'invest',
            args: [2n],
            value: 400000000000000n,
        }));
    });

    it('keeps round 2 allocation constants aligned with the full-cap example', () => {
        expect(BUY_PAGE_DEFAULTS).toMatchObject({
            roundId: 2,
            targetAvax: 5000,
            priceAvax: 0.0035,
            minAvax: 0.1,
            maxAvax: 500,
        });

        const strategy = ROUND_PROCEEDS_ALLOCATION.buckets.find((bucket) => bucket.percent === 85);
        const liquidity = ROUND_PROCEEDS_ALLOCATION.buckets.find((bucket) => bucket.percent === 10);
        const team = ROUND_PROCEEDS_ALLOCATION.buckets.find((bucket) => bucket.percent === 5);

        expect(strategy?.fullCapAvax).toBe(4250);
        expect(liquidity?.fullCapAvax).toBe(500);
        expect(team?.fullCapAvax).toBe(250);
        expect(liquidity?.detail).toMatch(/250 AVAX to LFJ LP and 250 AVAX to Pharaoh LP/i);
        expect(team?.detail).toMatch(/bootstrapping expenses/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/Separate from realized sale profit/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/25% treasury reinvestment/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/40% holder claim bucket/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/35% LP replenishment/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/market-buys \$CATCH/i);
    });

    it('renders the portfolio gallery with live positions and activity', async () => {
        renderAt('/portfolio');

        expect(await screen.findByRole('heading', { name: /^collection$/i })).toBeInTheDocument();
        expect(screen.getByText(/marketplace records and onchain registry data/i)).toBeInTheDocument();
        expect(screen.getByText(/^mark-to-market$/i)).toBeInTheDocument();
        expect(screen.getByText(/^cash funds$/i)).toBeInTheDocument();
        expect(screen.queryByText(/^2 recorded positions$/i)).not.toBeInTheDocument();
        expect(screen.getByText(/^\+10\.0%$/i)).toHaveClass('v2-up');
        expect(screen.getAllByText(/cost basis/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/gengar vmax/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/recorded card #2/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/^activity ledger$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^buy$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/data model/i)).not.toBeInTheDocument();
    });

    it('renders the holder dashboard with gated claim and market rows', async () => {
        renderAt('/holders');

        expect((await screen.findAllByText(/CATCH \/ USD/i)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$0\.0220/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/connect a wallet to see your \$CATCH/i)).toBeInTheDocument();
        expect(screen.getByText(/protocol accounting/i)).toBeInTheDocument();
        expect(screen.getByText(/liquidity & venues/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^LFJ$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Pharaoh$/).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /connect wallet/i }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /mint|invest|buy/i })).not.toBeInTheDocument();
    });

    it('keeps faq as a short edge-case page with forward links', async () => {
        renderAt('/faq');

        expect(await screen.findByRole('heading', { name: /the investor questions that need short answers/i })).toBeInTheDocument();
        expect(document.querySelectorAll('button[aria-expanded]').length).toBeGreaterThanOrEqual(7);
        expect(screen.getByRole('button', { name: /how are round 2 proceeds used/i })).toBeInTheDocument();

        const nextSection = screen.getByText(/ready to act on it\?/i).closest('section');
        expect(nextSection).not.toBeNull();
        expect(within(nextSection!).getByRole('link', { name: /join the round/i })).toBeInTheDocument();
        expect(within(nextSection!).getByRole('link', { name: /inspect the proof/i })).toBeInTheDocument();
    });
});
