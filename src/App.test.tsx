import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { BUY_PAGE_DEFAULTS, FINALIZED_RAISE_ARCHIVE, ROUND_PROCEEDS_ALLOCATION } from './data/protocol';

const wagmiMocks = vi.hoisted(() => ({
    account: {
        address: undefined as `0x${string}` | undefined,
        isConnected: false,
    },
    balanceValue: undefined as bigint | undefined,
    balanceReads: {} as Record<string, bigint | undefined>,
    roundState: undefined as any,
    contractEvents: [] as any[],
    blockNumber: 85856585n,
    getBlockNumber: vi.fn(),
    getBalance: vi.fn(),
    getContractEvents: vi.fn(),
    publicClient: undefined as any,
    readContractData: {} as Record<string, unknown>,
    holderDashboard: undefined as any,
    portfolioProofSummary: undefined as any,
    fetch: vi.fn(),
    reset: vi.fn(),
    writeContract: vi.fn(),
    writeContractAsync: vi.fn(),
    sendTransactionAsync: vi.fn(),
    switchChainAsync: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    readContract: vi.fn(),
}));

wagmiMocks.getBlockNumber.mockImplementation(async () => wagmiMocks.blockNumber);
wagmiMocks.getBalance.mockResolvedValue(100000000000000000000n);
wagmiMocks.getContractEvents.mockImplementation(async () => wagmiMocks.contractEvents);
wagmiMocks.waitForTransactionReceipt.mockResolvedValue({ status: 'success' });
wagmiMocks.readContract.mockImplementation(async ({ functionName }: { functionName?: string }) => {
    if (functionName === 'commits') return { escrow: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f' };
    if (functionName === 'balanceOf') return 100_000_000n;
    return undefined;
});
wagmiMocks.writeContractAsync
    .mockResolvedValueOnce('0x1111111111111111111111111111111111111111111111111111111111111111')
    .mockResolvedValueOnce('0x2222222222222222222222222222222222222222222222222222222222222222')
    .mockResolvedValueOnce('0x3333333333333333333333333333333333333333333333333333333333333333');
wagmiMocks.sendTransactionAsync.mockResolvedValue('0x4444444444444444444444444444444444444444444444444444444444444444');
wagmiMocks.switchChainAsync.mockResolvedValue(undefined);
wagmiMocks.publicClient = {
    getBlockNumber: wagmiMocks.getBlockNumber,
    getBalance: wagmiMocks.getBalance,
    getContractEvents: wagmiMocks.getContractEvents,
    waitForTransactionReceipt: wagmiMocks.waitForTransactionReceipt,
    readContract: wagmiMocks.readContract,
};
globalThis.fetch = wagmiMocks.fetch as typeof fetch;

vi.mock('@rainbow-me/rainbowkit', () => {
    const ConnectButton = Object.assign(
        () => <button type="button">Connect Wallet</button>,
        {
            Custom: ({ children }: { children: any }) =>
                children({
                    account: wagmiMocks.account.isConnected && wagmiMocks.account.address
                        ? { address: wagmiMocks.account.address, displayName: '0x1234...7890' }
                        : undefined,
                    chain: wagmiMocks.account.isConnected ? { id: 43114, name: 'Avalanche' } : undefined,
                    mounted: true,
                    openAccountModal: () => undefined,
                    openChainModal: () => undefined,
                    openConnectModal: () => undefined,
                }),
        },
    );

    return { ConnectButton };
});

vi.mock('./components/Web3Providers', () => ({
    Web3Providers: ({ children }: { children: any }) => <>{children}</>,
}));

vi.mock('wagmi', () => ({
    useAccount: () => wagmiMocks.account,
    useBalance: ({ chainId, token }: { chainId?: number; token?: `0x${string}` } = {}) => {
        const key = `${chainId ?? 'default'}:${token ? token.toLowerCase() : 'native'}`;
        const value = wagmiMocks.balanceReads[key] ?? (chainId || token ? undefined : wagmiMocks.balanceValue);
        return {
            data: value === undefined ? undefined : { value },
            isError: false,
            isLoading: false,
        };
    },
    usePublicClient: () => wagmiMocks.publicClient,
    useReadContract: ({ functionName }: { functionName?: string }) => ({
        data: functionName ? wagmiMocks.readContractData[functionName] : undefined,
    }),
    useSendTransaction: () => ({
        sendTransactionAsync: wagmiMocks.sendTransactionAsync,
        isPending: false,
    }),
    useSwitchChain: () => ({
        switchChainAsync: wagmiMocks.switchChainAsync,
    }),
    useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
    useWriteContract: () => ({
        data: undefined,
        error: undefined,
        isPending: false,
        reset: wagmiMocks.reset,
        writeContract: wagmiMocks.writeContract,
        writeContractAsync: wagmiMocks.writeContractAsync,
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
            strategyCurrentValueLabel: '$50.00',
            platformNavLabel: '$44.00',
            unrealizedPnlLabel: '$4.00',
            unrealizedPnlPercentLabel: '+10.0%',
            unrealizedPnlDirection: 'up',
            unrealizedSourceLabel: 'Courtyard profile NAV',
            portfolioValueLabel: '$40.00',
            liquidTreasuryLabel: '$10.00',
            referenceNavLabel: '$0.02',
            ...wagmiMocks.portfolioProofSummary,
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
            reason: 'Connect a wallet to inspect CATCH accounting.',
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
            holderProfitApr: 'No APR / APY',
            liquidTreasury: '$3,528.60',
            holderDistributionAccrued: '$0.00',
            marketSupportReserve: '$0.00',
            buybackBurnAccrued: '$0.00',
            lpSupportAccrued: '$0.00',
            liquidityCatchBuyAccrued: '$0.00',
            liquidityAvaxPairingAccrued: '$0.00',
        },
        raw: {
            referenceNav: 20000n,
            navPerToken: 20000n,
        },
        ...wagmiMocks.holderDashboard,
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

function mockSourceTokenBalances() {
    wagmiMocks.account = {
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
    };
    mockWalletPortfolioTokens([
        walletToken({ id: 'eth-mainnet', chain: 'Ethereum', chainId: 1, symbol: 'ETH', balance: 0.86, balanceUsd: 3285.2, priceUsdc: 3820 }),
        walletToken({ id: 'usdc-base', chain: 'Base', chainId: 8453, symbol: 'USDC', balance: 2480, balanceUsd: 2480, priceUsdc: 1, decimals: 6, tokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }),
        walletToken({ id: 'avax-avalanche', chain: 'Avalanche', chainId: 43114, symbol: 'AVAX', balance: 12.42, balanceUsd: 117.99, priceUsdc: 9.5 }),
    ]);
}

function walletToken(overrides: Partial<{
    id: string;
    chain: string;
    chainId: number;
    symbol: string;
    name: string;
    decimals: number;
    tokenAddress: `0x${string}`;
    isNative: boolean;
    balance: number;
    balanceUsd: number;
    priceUsdc: number;
}> = {}) {
    return {
        id: overrides.id ?? 'avax-avalanche',
        chain: overrides.chain ?? 'Avalanche',
        chainId: overrides.chainId ?? 43114,
        symbol: overrides.symbol ?? 'AVAX',
        name: overrides.name ?? overrides.symbol ?? 'AVAX',
        decimals: overrides.decimals ?? 18,
        tokenAddress: overrides.tokenAddress,
        isNative: overrides.isNative ?? !overrides.tokenAddress,
        balance: overrides.balance ?? 1,
        balanceUsd: overrides.balanceUsd ?? 10,
        priceUsdc: overrides.priceUsdc ?? 10,
    };
}

function mockWalletPortfolioTokens(tokens: ReturnType<typeof walletToken>[]) {
    wagmiMocks.fetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/wallet-portfolio')) {
            return new Response(JSON.stringify({ status: 'available', tokens }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }
        if (url.startsWith('/api/continuous-commit-route')) {
            return new Response(JSON.stringify({
                settlementToken: '0x0000000000000000000000000000000000000000',
                escrowAddress: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
                settlementAddress: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
                route: {
                    id: 'lifi-test-route',
                    tool: 'LI.FI',
                    toAmountRaw: '1000000000000000000',
                    toAmountMinRaw: '995000000000000000',
                    approvalAddress: '0xAaaaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
                    transactionRequest: {
                        to: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                        data: '0x',
                        value: '0',
                        chainId: 43114,
                    },
                },
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ error: 'Not mocked' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
        });
    });
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    wagmiMocks.account = { address: undefined, isConnected: false };
    wagmiMocks.balanceValue = undefined;
    wagmiMocks.balanceReads = {};
    wagmiMocks.roundState = undefined;
    wagmiMocks.contractEvents = [];
    wagmiMocks.blockNumber = 85856585n;
    wagmiMocks.getBlockNumber.mockReset();
    wagmiMocks.getBalance.mockReset();
    wagmiMocks.getContractEvents.mockReset();
    wagmiMocks.getBlockNumber.mockImplementation(async () => wagmiMocks.blockNumber);
    wagmiMocks.getBalance.mockResolvedValue(100000000000000000000n);
    wagmiMocks.getContractEvents.mockImplementation(async () => wagmiMocks.contractEvents);
    wagmiMocks.waitForTransactionReceipt.mockReset();
    wagmiMocks.waitForTransactionReceipt.mockResolvedValue({ status: 'success' });
    wagmiMocks.readContract.mockReset();
    wagmiMocks.readContract.mockImplementation(async ({ functionName }: { functionName?: string }) => {
        if (functionName === 'commits') return { escrow: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f' };
        if (functionName === 'balanceOf') return 100_000_000n;
        return undefined;
    });
    wagmiMocks.readContractData = {};
    wagmiMocks.holderDashboard = undefined;
    wagmiMocks.portfolioProofSummary = undefined;
    wagmiMocks.fetch.mockReset();
    wagmiMocks.reset.mockClear();
    wagmiMocks.writeContract.mockClear();
    wagmiMocks.writeContractAsync.mockReset();
    wagmiMocks.writeContractAsync
        .mockResolvedValueOnce('0x1111111111111111111111111111111111111111111111111111111111111111')
        .mockResolvedValueOnce('0x2222222222222222222222222222222222222222222222222222222222222222')
        .mockResolvedValueOnce('0x3333333333333333333333333333333333333333333333333333333333333333');
    wagmiMocks.sendTransactionAsync.mockReset();
    wagmiMocks.sendTransactionAsync.mockResolvedValue('0x4444444444444444444444444444444444444444444444444444444444444444');
    wagmiMocks.switchChainAsync.mockReset();
    wagmiMocks.switchChainAsync.mockResolvedValue(undefined);
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

        expect(labels).toEqual(['Mint $CATCH', 'How It Works', 'Portfolio', 'Holders', 'FAQ']);
    });

    it('uses wallet connect as the global navbar action', () => {
        const { container } = renderAt('/fundraising');
        const header = container.querySelector('header');

        expect(header).not.toBeNull();
        expect(within(header as HTMLElement).getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
        expect(within(header as HTMLElement).queryByRole('link', { name: /mint new \$catch/i })).not.toBeInTheDocument();
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

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/exposure to the 'mons you can't \$CATCH alone/i);
        expect(screen.getAllByText(/\$CATCH/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/GM10 turns sourcing, diligence, custody, valuation, and exits/i)).toBeInTheDocument();
        expect(screen.queryByText(/Liquidity routing is complete/i)).not.toBeInTheDocument();
        expect(screen.getByText(/the thesis/i)).toBeInTheDocument();
        expect(screen.getByText(/record public sale/i)).toBeInTheDocument();
        expect(screen.getByText(/the track record/i)).toBeInTheDocument();
        expect(screen.getByText(/current holdings/i)).toBeInTheDocument();
        expect(screen.getByText(/5,554\.4542 AVAX/i)).toBeInTheDocument();
        expect(screen.getByText(/commit-time USD value across recorded rounds, including live continuous commits/i)).toBeInTheDocument();
        expect(screen.queryByText(/raised across finalized rounds/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Continuous commits are the current entry mode/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/legacy raise of .* cap/i)).not.toBeInTheDocument();
        expect(screen.getByText(/strategy capital/i)).toBeInTheDocument();
        expect(screen.queryByText(/per commit/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/nav mint/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/live source/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/onchain logs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/proof live/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/block 85,655,273/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /mint new \$CATCH/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /top-grade pokémon cards have compounded/i })).toBeInTheDocument();
        expect(screen.getByText(/\$16\.5M/i)).toBeInTheDocument();
    });

    it('adds live continuous settlements to the homepage strategy capital total', async () => {
        wagmiMocks.contractEvents = [
            { args: { settlementAmountUsdt6: 950_000_000n } },
        ];
        wagmiMocks.blockNumber = 87228003n;

        renderAt('/');

        await waitFor(() => {
            expect(screen.getByText(/5,654\.4542 AVAX/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/\+2\.8% MoM in AVAX/i)).toBeInTheDocument();
        expect(screen.queryByText(/onchain logs/i)).not.toBeInTheDocument();
    });

    it('polls only new continuous settlement blocks after the initial capital scan', async () => {
        vi.useFakeTimers();
        wagmiMocks.blockNumber = 87228003n;
        const eventRanges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
        wagmiMocks.getContractEvents.mockImplementation(async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
            eventRanges.push({ fromBlock, toBlock });
            return [{ args: { settlementAmountUsdt6: 950_000_000n } }];
        });

        renderAt('/');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(screen.getByText(/5,654\.4542 AVAX/i)).toBeInTheDocument();
        expect(eventRanges[eventRanges.length - 1]).toEqual({ fromBlock: 87228002n, toBlock: 87228003n });
        const activeInitialScanCount = eventRanges.length;

        wagmiMocks.blockNumber = 87228005n;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        await act(async () => {
            await Promise.resolve();
        });

        expect(eventRanges[eventRanges.length - 1]).toEqual({ fromBlock: 87228004n, toBlock: 87228005n });
        expect(eventRanges.slice(activeInitialScanCount)).not.toContainEqual({ fromBlock: 87228002n, toBlock: 87228003n });
        expect(screen.getByText(/5,754\.4542 AVAX/i)).toBeInTheDocument();
    });

    it('uses commit-time AVAX and USDC-equivalent values for homepage strategy capital', async () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                targetAmount: 5000000000000000000000n,
                raisedAmount: 1353983600000000000000n,
                tokenPrice: 3500000000000000n,
                minInvestment: 100000000000000000n,
                maxInvestment: 500000000000000000000n,
                startTime: 1776351600n,
                endTime: 1778943600n,
                isActive: false,
                isFinalized: true,
            },
            status: 'Finalized',
            progress: 27.079672,
            isRoundOpen: false,
            isUpcoming: false,
            isClosed: true,
            isPlanned: false,
            roundSource: 'onchain',
            startsAt: 1776351600,
            endsAt: 1778943600,
            archiveRound: {
                raisedAmount: 500000000000000000000n,
            },
            targetLabel: '5,000 AVAX',
            raisedLabel: '1,353.9836 AVAX',
            priceLabel: '0.0035 AVAX',
            minMaxLabel: '0.1 to 500 AVAX',
            links: [],
        };
        wagmiMocks.getContractEvents.mockImplementation(async ({ eventName }: { eventName?: string }) => {
            if (eventName === 'ContinuousMintAvaxSettled') {
                return [{
                    args: {
                        avaxAmountWei: 20_000_000_000_000_000_000n,
                        settlementAmountUsdt6: 1_000_000_000n,
                    },
                }];
            }
            return [];
        });

        renderAt('/');

        await waitFor(() => {
            expect(screen.getByText(/1,908\.4382 AVAX/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/\+2\.9% MoM in AVAX/i)).toBeInTheDocument();
        expect(screen.getByText(/~\$17,864 commit-time USD value across recorded rounds, including live continuous commits/i)).toBeInTheDocument();
    });

    it('does not count the Round 2 close ledger in homepage capital before Round 2 is published or live', () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                raisedAmount: 0n,
                isActive: false,
                isFinalized: false,
            },
            status: 'Round 2 setup in progress',
            isRoundOpen: false,
            isClosed: false,
            isPlanned: true,
            roundSource: 'planned',
            archiveRound: {
                raisedAmount: 500000000000000000000n,
            },
        };

        renderAt('/');

        expect(screen.getByText(/^554\.4546 AVAX$/i)).toBeInTheDocument();
        expect(screen.queryByText(/1,853\.9836 AVAX/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/5,499\.9996 AVAX/i)).not.toBeInTheDocument();
    });

    it('merges buy and live proof into the fundraising route', async () => {
        wagmiMocks.readContractData.continuousMintPaused = false;
        wagmiMocks.readContractData.accountedFundAvaxSettlementWei = 1000000000000000000n;
        mockSourceTokenBalances();
        renderAt('/fundraising');

        expect(await screen.findByRole('heading', { name: /continuous round/i })).toBeInTheDocument();
        expect(screen.queryByText(/you're not buying one card/i)).not.toBeInTheDocument();
        expect(screen.getByText(/NAV-backed token price/i)).toBeInTheDocument();
        expect(screen.getByText(/^mint spread$/i)).toBeInTheDocument();
        expect(screen.getByText(/^settlement$/i)).toBeInTheDocument();
        expect(screen.queryByText(/^mint price$/i)).not.toBeInTheDocument();
        expect(screen.getByText(/^commit preview$/i)).toBeInTheDocument();
        expect(screen.getByText(/from virtually any chain/i)).toBeInTheDocument();
        expect(screen.getByText(/^segment mints$/i)).toBeInTheDocument();
        const sourceTokenSelect = await screen.findByRole('combobox', { name: /source token/i }) as HTMLSelectElement;
        expect(sourceTokenSelect.value).toBe('eth-mainnet');
        expect(screen.getByText(/balance 0\.86 ETH/i)).toBeInTheDocument();
        await waitFor(() => expect(sourceTokenSelect).not.toBeDisabled());
        fireEvent.change(sourceTokenSelect, { target: { value: 'usdc-base' } });
        await waitFor(() => expect(sourceTokenSelect.value).toBe('usdc-base'));
        expect(await screen.findByText(/balance 2,480 USDC/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/commit amount in USDC/i)).toBeInTheDocument();
        expect(screen.queryByText(/SOL on Solana/i)).not.toBeInTheDocument();
        expect(screen.getByText(/every continuous commit has an immediate route/i)).toBeInTheDocument();
        expect(screen.getAllByText(/strategy buying power/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/LP support reserve/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/segment token mints/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: /round 1 closed early/i })).toBeInTheDocument();
        expect(screen.queryByText(/round 1 complete/i)).not.toBeInTheDocument();
        expect(screen.getByText(/proof surface/i)).toBeInTheDocument();
        expect(screen.getAllByText(/fund proxy/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/portfolio registry/i)).toBeInTheDocument();
        expect(screen.getByText(/wallet accounting/i)).toBeInTheDocument();
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/wallet disconnected/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mint new \$CATCH/i })).toBeInTheDocument();
        expect(screen.queryByText(/unfilled legacy cap/i)).not.toBeInTheDocument();
        expect(screen.getByText(/^raised all-time$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/1,854\.9836 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/1,353\.9836 AVAX finalized/i)).not.toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /follow on x/i }).length).toBeGreaterThan(0);
    });

    it('blocks continuous commit preview until the mint pause state is known', async () => {
        mockSourceTokenBalances();
        renderAt('/fundraising');

        expect(await screen.findByRole('heading', { name: /continuous round/i })).toBeInTheDocument();
        fireEvent.change(await screen.findByLabelText(/commit amount in ETH/i), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /mint new \$CATCH/i }));

        const loadingError = await screen.findByText(/pause state is still loading/i);
        expect(loadingError).toBeInTheDocument();
        expect(loadingError).toHaveClass('v2-down');
        expect(screen.queryByText(/preview is ready/i)).not.toBeInTheDocument();
        expect(wagmiMocks.writeContract).not.toHaveBeenCalled();
    });

    it('shows the post-Round 2 close ledger instead of wallet prompts when the round is finalized', async () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                roundId: 2n,
                targetAmount: 5000000000000000000000n,
                raisedAmount: 1353983600000000000000n,
                tokenPrice: 3500000000000000n,
                minInvestment: 100000000000000000n,
                maxInvestment: 500000000000000000000n,
                startTime: 1776351600n,
                endTime: 1778943600n,
                isActive: false,
                isFinalized: true,
            },
            status: 'Finalized',
            progress: 27.079672,
            isRoundOpen: false,
            isUpcoming: false,
            isClosed: true,
            isPlanned: false,
            roundSource: 'onchain',
            startsAt: 1776351600,
            endsAt: 1778943600,
            archiveRound: undefined,
            targetLabel: '5,000 AVAX',
            raisedLabel: '1,353.9836 AVAX',
            priceLabel: '0.0035 AVAX',
            minMaxLabel: '0.1 to 500 AVAX',
            links: [],
        };

        renderAt('/fundraising');

        expect(await screen.findByRole('heading', { name: /continuous round/i })).toBeInTheDocument();
        expect(screen.queryByText(/post-close ledger/i)).not.toBeInTheDocument();
        expect(screen.getByText(/finalized rounds · proof live/i)).toBeInTheDocument();
        expect(screen.getAllByText(/1,853\.9836 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/\$17,461\.77 commit-time USD/i)).toBeInTheDocument();
        expect(screen.getAllByText(/1,650\.8861 AVAX/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/LFJ liquidity route/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Pharaoh liquidity route/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Round 1 and Round 2 totals are archived, not the current purchase mechanic/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Round 1 and Round 2 closed and finalized/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Fixed-window buys are closed/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Avalanche 0xb6bf...C027/i)).toBeInTheDocument();
        expect(screen.queryByText(/wallet disconnected/i)).not.toBeInTheDocument();
        expect(within(screen.getByRole('main')).queryByRole('button', { name: /connect wallet/i })).not.toBeInTheDocument();
    });

    it('shows post-round token mechanics and total raised on the catch page', async () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                raisedAmount: 1353983600000000000000n,
                isActive: false,
                isFinalized: true,
            },
            status: 'Finalized',
            isRoundOpen: false,
            archiveRound: {
                raisedAmount: 500000000000000000000n,
            },
        };
        wagmiMocks.readContractData.previewContinuousMint = [
            100_000_000_000_000_000_000n,
            1_000_000_000_000_000_000n,
            1_000_000n,
        ];

        renderAt('/catch');

        expect(await screen.findByRole('heading', { level: 1, name: /a tcg strategy designed to accrue value to \$catch/i })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 1, name: /from contribution to exit/i })).not.toBeInTheDocument();
        expect(await screen.findByText(/dynamic supply/i)).toBeInTheDocument();
        expect(screen.getByText(/pricing model/i)).toBeInTheDocument();
        expect(screen.getByText(/5% below risk-free price/i)).toBeInTheDocument();
        expect(screen.getByText(/primary commits mint at 95% of NAV/i)).toBeInTheDocument();
        expect(screen.queryByText(/minted to buyers/i)).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /three things happen when you mint/i })).toBeInTheDocument();
        expect(screen.getByText(/your commit becomes fund capital/i)).toBeInTheDocument();
        expect(screen.getByText(/you commit/i)).toBeInTheDocument();
        expect(screen.getByText(/gm10 buys and prices cards/i)).toBeInTheDocument();
        expect(screen.getByText(/\$CATCH follows the portfolio/i)).toBeInTheDocument();
        expect(screen.getAllByText(/100 CATCH/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/1 CATCH each per 100 USDC preview/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Live contract preview: a 100 USDC settled commit mints 100 CATCH to the buyer and 1 CATCH to each of 5 configured segment wallets/i)).toBeInTheDocument();
        expect(screen.getAllByText(/95\.24%/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/excluded from circulating supply/i)).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /price starts with what gm10 owns/i })).toBeInTheDocument();
        expect(screen.getByText(/leaves market-support buckets out of the backing math/i)).toBeInTheDocument();
        expect(screen.getByText(/same-card trade/i)).toBeInTheDocument();
        expect(screen.getByText(/similar-card sales/i)).toBeInTheDocument();
        expect(screen.getByText(/conservative fallback/i)).toBeInTheDocument();
        expect(screen.getByText(/market-support liquidity is not counted as backing/i)).toBeInTheDocument();
        expect(screen.getByText(/total raised to date/i)).toBeInTheDocument();
        expect(screen.getByText(/1,908\.4382 AVAX/i)).toBeInTheDocument();
        expect(screen.getByText(/Round 1, Round 2, and continuous commits/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /a card sale turns into routed strategy capital/i })).toBeInTheDocument();
        expect(screen.getByText(/when a card sells, the cash returns to Avalanche/i)).toBeInTheDocument();
        expect(screen.getByText(/GM10 puts back the card's original cost/i)).toBeInTheDocument();
        expect(screen.getByText(/only the profit is routed/i)).toBeInTheDocument();
        expect(screen.queryByText(/payout button/i)).not.toBeInTheDocument();
        expect(screen.getByText(/profit can stay liquid for the next card purchase/i)).toBeInTheDocument();
        expect(screen.getByText(/operator-led/i)).toBeInTheDocument();
        expect(screen.getByText(/community signal/i)).toBeInTheDocument();
        expect(screen.getByText(/onchain control/i)).toBeInTheDocument();
        expect(screen.queryByText(/Rounds 1–3/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Rounds 4–5/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/From Round 6/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/investor p&l/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/your position, always visible/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/example investor view/i)).not.toBeInTheDocument();
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

        expect((await screen.findAllByText(/continuous round/i)).length).toBeGreaterThan(0);
        expect(screen.getByText(/per-commit minting at live NAV/i)).toBeInTheDocument();
        expect(screen.getByText(/NAV-backed token price/i)).toBeInTheDocument();
        expect(screen.queryByText(/^closed\.$/i)).not.toBeInTheDocument();
    });

    it('registers a commit and submits the LI.FI route without using the legacy invest flow', async () => {
        wagmiMocks.readContractData.continuousMintPaused = false;
        mockSourceTokenBalances();
        renderAt('/fundraising');

        fireEvent.change(await screen.findByRole('combobox', { name: /source token/i }), { target: { value: 'usdc-base' } });
        const amountInput = await screen.findByLabelText(/commit amount in USDC/i);
        fireEvent.change(amountInput, { target: { value: '100' } });
        fireEvent.click(screen.getByRole('button', { name: /mint new \$CATCH/i }));

        expect(wagmiMocks.writeContract).not.toHaveBeenCalled();
        await waitFor(() => expect(wagmiMocks.writeContractAsync).toHaveBeenCalled());
        expect(wagmiMocks.sendTransactionAsync).toHaveBeenCalled();
        const readyStatus = await screen.findByRole('status');
        expect(readyStatus).toHaveTextContent(/source transaction confirmed/i);
        expect(readyStatus).toHaveClass('v2-up');
    });

    it('settles same-chain routes after the escrow receives settlement tokens', async () => {
        wagmiMocks.readContractData.continuousMintPaused = false;
        mockSourceTokenBalances();
        renderAt('/fundraising');

        fireEvent.change(await screen.findByRole('combobox', { name: /source token/i }), { target: { value: 'avax-avalanche' } });
        const amountInput = await screen.findByLabelText(/commit amount in AVAX/i);
        fireEvent.change(amountInput, { target: { value: '1' } });
        const previewButton = screen.getByRole('button', { name: /mint new \$CATCH/i });

        expect(previewButton).toBeEnabled();
        fireEvent.click(previewButton);

        expect(screen.queryByText(/exceeds the detected/i)).not.toBeInTheDocument();
        await waitFor(() => expect(wagmiMocks.writeContractAsync).toHaveBeenCalledTimes(2));
        expect(wagmiMocks.sendTransactionAsync).toHaveBeenCalled();
        const readyStatus = await screen.findByRole('status');
        expect(readyStatus).toHaveTextContent(/mint complete/i);
        expect(readyStatus).toHaveClass('v2-up');
    });

    it('shows top wallet source tokens from the live portfolio response, not static fixtures', async () => {
        wagmiMocks.readContractData.continuousMintPaused = false;
        wagmiMocks.account = {
            address: '0x1234567890123456789012345678901234567890',
            isConnected: true,
        };
        mockWalletPortfolioTokens([
            walletToken({ id: 'weth-arbitrum', chain: 'Arbitrum', symbol: 'WETH', balance: 2, balanceUsd: 7600, priceUsdc: 3800, tokenAddress: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' }),
            walletToken({ id: 'usdc-base', chain: 'Base', symbol: 'USDC', balance: 42, balanceUsd: 42, priceUsdc: 1, decimals: 6, tokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }),
            walletToken({ id: 'avax-avalanche', chain: 'Avalanche', symbol: 'AVAX', balance: 3.33, balanceUsd: 31.64, priceUsdc: 9.5 }),
            walletToken({ id: 'op-optimism', chain: 'Optimism', symbol: 'OP', balance: 10, balanceUsd: 20, priceUsdc: 2, tokenAddress: '0x4200000000000000000000000000000000000042' }),
            walletToken({ id: 'matic-polygon', chain: 'Polygon', symbol: 'POL', balance: 20, balanceUsd: 10, priceUsdc: 0.5, tokenAddress: '0x0000000000000000000000000000000000001010' }),
            walletToken({ id: 'dust-base', chain: 'Base', symbol: 'DUST', balance: 1000, balanceUsd: 1, priceUsdc: 0.001, tokenAddress: '0x1111111111111111111111111111111111111111' }),
        ]);

        renderAt('/fundraising');

        const sourceTokenSelect = await screen.findByRole('combobox', { name: /source token/i }) as HTMLSelectElement;
        expect(sourceTokenSelect.value).toBe('weth-arbitrum');
        expect(await screen.findByText(/balance 2 WETH/i)).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /WETH on Arbitrum - 2 available/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /USDC on Base - 42 available/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /AVAX on Avalanche - 3\.33 available/i })).toBeInTheDocument();
        expect(screen.getAllByRole('option')).toHaveLength(5);
        expect(screen.queryByRole('option', { name: /DUST on Base/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/balance 12\.42 AVAX/i)).not.toBeInTheDocument();

        fireEvent.change(sourceTokenSelect, { target: { value: 'usdc-base' } });

        expect(await screen.findByText(/balance 42 USDC/i)).toBeInTheDocument();
        expect(screen.queryByText(/balance 2,480 USDC/i)).not.toBeInTheDocument();
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
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/separate from sale-profit routing/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/settled proceeds on Avalanche/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/market snapshot/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/card-buying power/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/LP support/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/buyback-and-burn/i);
        expect(ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall).toMatch(/Routine holder claims are disabled/i);
        expect(FINALIZED_RAISE_ARCHIVE).toMatchObject({
            totalAvax: 1853.9836,
            commitmentUsd: 17461.77,
            displayUsdLabel: '$17,462',
        });
        expect(FINALIZED_RAISE_ARCHIVE.rounds.map((round) => round.eventCount)).toEqual([28, 38]);
    });

    it('renders the portfolio gallery with live positions and activity', async () => {
        renderAt('/portfolio');

        expect(await screen.findByRole('heading', { name: /^collection$/i })).toBeInTheDocument();
        expect(screen.getByText(/marketplace records and onchain registry data/i)).toBeInTheDocument();
        expect(screen.getByText(/^card marks$/i)).toBeInTheDocument();
        expect(screen.getByText(/^cash funds$/i)).toBeInTheDocument();
        expect(screen.getByText(/^strategy value$/i)).toBeInTheDocument();
        expect(screen.queryByText(/^2 recorded positions$/i)).not.toBeInTheDocument();
        expect(screen.getByText(/P\/L .* \+10\.0%/i)).toHaveClass('v2-up');
        expect(screen.getAllByText(/cost basis/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/gengar vmax/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/recorded card #2/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/^activity ledger$/i)).toBeInTheDocument();
        expect(screen.getAllByText(/^buy$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/resume slabs/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/data model/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^continuous sourcing$/i)).not.toBeInTheDocument();
    });

    it('renders the holder dashboard with gated claim and market rows', async () => {
        wagmiMocks.roundState = {
            roundId: 2,
            round: {
                roundId: 2n,
                targetAmount: 5000000000000000000000n,
                raisedAmount: 1353983600000000000000n,
                tokenPrice: 3500000000000000n,
                minInvestment: 100000000000000000n,
                maxInvestment: 500000000000000000000n,
                startTime: 1776351600n,
                endTime: 1778943600n,
                isActive: false,
                isFinalized: true,
            },
            status: 'Finalized',
            progress: 27.079672,
            isRoundOpen: false,
            isUpcoming: false,
            isClosed: true,
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
            raisedLabel: '1,353.9836 AVAX',
            priceLabel: '0.0035 AVAX',
            minMaxLabel: '0.1 to 500 AVAX',
            links: [],
        };

        renderAt('/holders');

        expect((await screen.findAllByText(/CATCH \/ USD/i)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$0\.0220/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/connect a wallet to see your \$CATCH/i)).toBeInTheDocument();
        expect(screen.getByText(/protocol accounting/i)).toBeInTheDocument();
        expect(screen.getByText(/supply composition/i)).toBeInTheDocument();
        expect(screen.getByText(/dynamic supply expands when successful commits mint from settled value/i)).toBeInTheDocument();
        expect(screen.getByText(/Liquid \$3,528\.60 incl\. settled sale proceeds · Cards \$40\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/sale-inclusive liquid treasury plus card marks/i)).toBeInTheDocument();
        expect(screen.queryByText(/market-support reserve/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/total minted/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/excluded system supply/i).length).toBeGreaterThan(0);
        const profitEligibleHero = screen.getAllByText(/174,421\.1693 CATCH/i)[0].closest('.relative');
        expect(profitEligibleHero).toHaveClass('h-28');
        expect(screen.queryByText(/no fixed cap/i)).not.toBeInTheDocument();
        expect(screen.getByText(/liquidity & venues/i)).toBeInTheDocument();
        expect(screen.queryByText(/switch tabs/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^all venues$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^lfj$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^pharaoh$/i })).not.toBeInTheDocument();
        expect(screen.getAllByText(/^LFJ$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Pharaoh$/).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /connect wallet/i }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /mint|invest|buy/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/no apr \/ apy/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/apr\/apy/i)).not.toBeInTheDocument();
        expect(screen.getByText(/\$CATCH market-buy reserve from all proceeds/i)).toBeInTheDocument();
        expect(screen.getByText(/Round 1 and finalized Round 2 round-proceeds market buys/i)).toBeInTheDocument();
        expect(screen.getAllByText(/\$880\.64/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Sale proceeds \$0\.00 \+ round proceeds 92\.6992 AVAX .* rounds .* 5% of 1,853\.98 AVAX raised/i)).toBeInTheDocument();
        expect(screen.queryByText(/\$CATCH market-buy reserve from sale proceeds/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Buyback from round proceeds/i)).not.toBeInTheDocument();
    });

    it('keeps the all-proceeds market-buy value unavailable when sale proceeds are unavailable', async () => {
        wagmiMocks.holderDashboard = {
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
                holderProfitApr: 'No APR / APY',
                liquidTreasury: '$3,528.60',
                holderDistributionAccrued: '$0.00',
                marketSupportReserve: '$0.00',
                buybackBurnAccrued: '$0.00',
                lpSupportAccrued: '$0.00',
                liquidityCatchBuyAccrued: 'Unavailable',
                liquidityAvaxPairingAccrued: '$0.00',
            },
        };

        renderAt('/holders');

        const allProceedsRow = (await screen.findByText(/\$CATCH market-buy reserve from all proceeds/i)).closest('.grid') as HTMLElement | null;
        expect(allProceedsRow).not.toBeNull();
        expect(within(allProceedsRow!).getByText(/^Unavailable$/)).toBeInTheDocument();
        expect(within(allProceedsRow!).getByText(/Sale proceeds unavailable \+ round proceeds 25 AVAX/i)).toBeInTheDocument();
        expect(within(allProceedsRow!).queryByText(/^\$237\.50$/)).not.toBeInTheDocument();
    });

    it('uses live NAV for connected wallet reference value', async () => {
        wagmiMocks.holderDashboard = {
            account: '0x7f1c000000000000000000000000000000007852',
            isConnected: true,
            labels: {
                totalSupply: '100 CATCH',
                profitEligibleSupply: '100 CATCH',
                referenceNav: '$0.02',
                navPerToken: '$0.02',
                catchBalance: '10 CATCH',
                remainingCostBasis: '$21.00',
                currentReferenceValue: '$0.20',
                unrealizedReferencePnl: '-$20.80',
                claimableProfit: 'Unavailable',
                claimedProfit: '0 AVAX',
                totalProfitDeposited: '0 AVAX',
                holderProfitsClaimableClaimed: '$0.00',
                holderProfitApr: 'No APR / APY',
                liquidTreasury: '$100.00',
                holderDistributionAccrued: '$0.00',
                marketSupportReserve: '$0.00',
                buybackBurnAccrued: '$0.00',
                lpSupportAccrued: '$0.00',
                liquidityCatchBuyAccrued: '$0.00',
                liquidityAvaxPairingAccrued: '$0.00',
            },
        };
        wagmiMocks.portfolioProofSummary = {
            onchainCurrentMarkLabel: '$200.00',
            liquidTreasuryLabel: '$100.00',
        };

        renderAt('/holders');

        expect(await screen.findByText(/^Reference value$/i)).toBeInTheDocument();
        expect(screen.getByText('$30.00')).toBeInTheDocument();
        expect(screen.getByText('+$9.00')).toBeInTheDocument();
        expect(screen.queryByText('$0.20')).not.toBeInTheDocument();
    });

    it('keeps faq as a short edge-case page with forward links', async () => {
        renderAt('/faq');

        expect(await screen.findByRole('heading', { name: /the investor questions that need short answers/i })).toBeInTheDocument();
        expect(document.querySelectorAll('button[aria-expanded]').length).toBeGreaterThanOrEqual(7);
        expect(screen.getByRole('button', { name: /how do continuous commits route value/i })).toBeInTheDocument();

        const nextSection = screen.getByText(/ready to act on it\?/i).closest('section');
        expect(nextSection).not.toBeNull();
        expect(within(nextSection!).getByRole('link', { name: /mint new \$CATCH/i })).toBeInTheDocument();
        expect(within(nextSection!).getByRole('link', { name: /inspect the proof/i })).toBeInTheDocument();
    });
});
