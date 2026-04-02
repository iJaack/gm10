import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@rainbow-me/rainbowkit', () => ({
    ConnectButton: () => <button type="button">Connect Wallet</button>,
}));

vi.mock('wagmi', () => ({
    useAccount: () => ({ isConnected: false }),
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
                acquisition: '$18.00',
                currentValue: '$18.00',
                chain: 'Avalanche Fuji',
                tokenId: '1',
                collectionAddress: '0xA2Abe7905b185949c5dBefEb86C1D0F5492E74fF',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0xA2Abe7905b185949c5dBefEb86C1D0F5492E74fF',
            },
            {
                positionId: 2,
                acquisition: '$22.00',
                currentValue: '$22.00',
                chain: 'Avalanche Fuji',
                tokenId: '1',
                collectionAddress: '0x05F9188eD398D7dA979861617eBA59d7B1DEeA66',
                snowtraceUrl: 'https://testnet.snowtrace.io/address/0x05F9188eD398D7dA979861617eBA59d7B1DEeA66',
            },
        ],
        proofSummary: {
            holdingsLabel: '2 recorded positions',
            holdingsChipLabel: '2 positions',
            portfolioValueLabel: '$40.00',
            liquidTreasuryLabel: '$10.00',
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
    it('shows only the four public routes in the desktop nav', () => {
        const { container } = renderAt('/');
        const desktopNav = container.querySelector('header nav');

        expect(desktopNav).not.toBeNull();
        const labels = Array.from(desktopNav!.querySelectorAll('a')).map((link) =>
            link.textContent?.replace(/^[↗►]/, '').trim(),
        );

        expect(labels).toEqual(['Home', 'Buy', 'Portfolio', 'FAQ']);
        expect(screen.queryByText('How it Works')).not.toBeInTheDocument();
    });

    it.each([
        ['/testnet-status', '/fundraising#proof'],
        ['/how-it-works', '/#how-it-works'],
        ['/tokenomics', '/#token'],
        ['/governance', '/#governance'],
        ['/nav-methodology', '/#pricing'],
        ['/sales-proceeds', '/#exits'],
        ['/investor-pnl', '/#wallet'],
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

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/the cards you can't buy alone/i);
        expect(screen.getAllByText(/trophy-grade/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/your share/i)).toBeInTheDocument();
        expect(document.getElementById('why-gm10')).not.toBeNull();
        expect(document.getElementById('evidence')).not.toBeNull();
        expect(document.getElementById('how-it-works')).not.toBeNull();
        expect(document.getElementById('token')).not.toBeNull();
        expect(document.getElementById('pricing')).not.toBeNull();
        expect(document.getElementById('exits')).not.toBeNull();
        expect(document.getElementById('wallet')).not.toBeNull();
        expect(document.getElementById('governance')).not.toBeNull();
        expect(screen.getByText(/market evidence, not guaranteed results/i)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /buy \$catch/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /already live\. already inspectable\./i })).toBeInTheDocument();
    });

    it('merges buy and live proof into the fundraising route', () => {
        renderAt('/fundraising');

        expect(screen.getByRole('heading', { name: /enter the round\./i })).toBeInTheDocument();
        expect(screen.getByText(/you're not buying one card/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /inspect everything\./i })).toBeInTheDocument();
        expect(screen.getByText(/^positions$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^2$/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/contracts, round state, and recorded positions/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /connect wallet/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
    });

    it('keeps the portfolio split between editorial lanes and live fuji status', () => {
        renderAt('/portfolio');

        expect(screen.getByRole('heading', { name: /the vault\. every card, every position\./i })).toBeInTheDocument();
        expect(screen.getByText(/^charizard$/i)).toBeInTheDocument();
        expect(screen.getByText(/^live on fuji$/i)).toBeInTheDocument();
        expect(screen.getByText(/^2 positions$/i)).toBeInTheDocument();
        expect(screen.getByText(/marked value/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/data model/i)).not.toBeInTheDocument();
    });

    it('keeps faq as a short edge-case page with forward links', () => {
        renderAt('/faq');

        expect(screen.getByRole('heading', { name: /the short answers\./i })).toBeInTheDocument();
        expect(document.querySelectorAll('button[aria-expanded]').length).toBeGreaterThanOrEqual(7);

        const nextSection = screen.getByRole('heading', { name: /ready to get started\?/i }).closest('section');
        expect(nextSection).not.toBeNull();
        expect(within(nextSection!).getByRole('link', { name: /buy \$catch/i })).toBeInTheDocument();
        expect(within(nextSection!).getByRole('link', { name: /portfolio/i })).toBeInTheDocument();
        expect(within(nextSection!).getByRole('link', { name: /follow on x/i })).toBeInTheDocument();
    });
});
