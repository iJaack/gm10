import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@rainbow-me/rainbowkit', () => ({
    ConnectButton: () => <button type="button">Connect Wallet</button>,
}));

vi.mock('./components/Web3Providers', () => ({
    Web3Providers: ({ children }: { children: any }) => <>{children}</>,
}));

vi.mock('wagmi', () => ({
    useAccount: () => ({ isConnected: false }),
    useBalance: () => ({ data: undefined }),
    useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
    useWriteContract: () => ({
        data: undefined,
        error: undefined,
        isPending: false,
        reset: () => undefined,
        writeContract: () => undefined,
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
    useFujiRoundState: () => ({
        roundId: 1,
        round: {
            targetAmount: 10000000000000000000n,
            raisedAmount: 6000000000000000000n,
            tokenPrice: 2500000000000000n,
            minInvestment: 100000000000000000n,
            maxInvestment: 200000000000000000000n,
            isActive: true,
            isFinalized: false,
        },
        status: 'Live on Fuji',
        progress: 60,
        targetLabel: '10,000 AVAX',
        raisedLabel: '6 AVAX',
        priceLabel: '0.0025 AVAX',
        minMaxLabel: '0.1 to 200 AVAX',
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
            liquidTreasury: '$3,528.60',
            holderDistributionAccrued: '$0.00',
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

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/get exposure to trophy-grade pokemon cards/i);
        expect(screen.getAllByText(/trophy-grade/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/GM10 gives crypto investors the exposure/i)).toBeInTheDocument();
        expect(document.getElementById('why-market')).not.toBeNull();
        expect(document.getElementById('why-gm10')).not.toBeNull();
        expect(document.getElementById('how-it-works')).not.toBeNull();
        expect(document.getElementById('proof')).not.toBeNull();
        expect(document.getElementById('investor-objections')).not.toBeNull();
        expect(screen.getByText(/Move from the story to the live round and proof/i)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /join next round|join the round/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /the strategy already has a public proof surface/i })).toBeInTheDocument();
    });

    it('merges buy and live proof into the fundraising route', async () => {
        renderAt('/fundraising');

        expect(await screen.findByRole('heading', { name: /take one position in the full gm10 strategy/i })).toBeInTheDocument();
        expect(screen.getByText(/you're not buying one card/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /inspect everything\./i })).toBeInTheDocument();
        expect(screen.getByText(/^positions$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^2$/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/contracts, round state, and recorded positions/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /connect wallet/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
    });

    it('renders the portfolio gallery with live positions and activity', async () => {
        renderAt('/portfolio');

        expect(await screen.findByRole('heading', { name: /card portfolio/i })).toBeInTheDocument();
        expect(screen.getByText(/^2 acquired cards$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/cost basis/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/courtyard platform nav/i)).toBeInTheDocument();
        expect(screen.getAllByText(/gengar vmax/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/recorded card #2/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/^activity$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^buy$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/data model/i)).not.toBeInTheDocument();
    });

    it('renders the holder dashboard with gated claim and market rows', async () => {
        renderAt('/holders');

        expect(await screen.findByRole('heading', { name: /holder dashboard/i })).toBeInTheDocument();
        expect(screen.getByText(/claim gated/i)).toBeInTheDocument();
        expect(screen.getByText(/connect a wallet to check realized profit/i)).toBeInTheDocument();
        expect(screen.getByText(/\$catch price and liquidity/i)).toBeInTheDocument();
        expect(screen.getByText(/^LFJ$/)).toBeInTheDocument();
        expect(screen.getByText(/^Pharaoh$/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /claim avax disabled/i })).toBeDisabled();
        expect(screen.queryByRole('button', { name: /mint|invest|buy/i })).not.toBeInTheDocument();
    });

    it('keeps faq as a short edge-case page with forward links', async () => {
        renderAt('/faq');

        expect(await screen.findByRole('heading', { name: /the investor questions that need short answers/i })).toBeInTheDocument();
        expect(document.querySelectorAll('button[aria-expanded]').length).toBeGreaterThanOrEqual(7);

        const nextSection = screen.getByRole('heading', { name: /ready to get started\?/i }).closest('section');
        expect(nextSection).not.toBeNull();
        expect(within(nextSection!).getByRole('link', { name: /join next round/i })).toBeInTheDocument();
        expect(within(nextSection!).getByRole('link', { name: /inspect the proof/i })).toBeInTheDocument();
    });
});
