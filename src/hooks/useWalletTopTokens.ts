import { useEffect, useState } from 'react';

export type WalletSourceToken = {
    id: string;
    chain: string;
    chainId?: number;
    symbol: string;
    name: string;
    decimals: number;
    tokenAddress?: `0x${string}`;
    isNative: boolean;
    balance: number;
    balanceUsd: number;
    priceUsdc: number;
};

export type WalletTopTokensStatus = 'connect' | 'loading' | 'ready' | 'empty' | 'error';

type WalletPortfolioResponse = {
    tokens?: WalletSourceToken[];
    error?: string;
};

function isWalletToken(value: unknown): value is WalletSourceToken {
    if (!value || typeof value !== 'object') return false;
    const token = value as Partial<WalletSourceToken>;
    return Boolean(
        token.id
        && token.chain
        && token.symbol
        && token.name
        && typeof token.decimals === 'number'
        && typeof token.balance === 'number'
        && typeof token.balanceUsd === 'number'
        && typeof token.priceUsdc === 'number',
    );
}

export function useWalletTopTokens(address?: `0x${string}`) {
    const [tokens, setTokens] = useState<WalletSourceToken[]>([]);
    const [status, setStatus] = useState<WalletTopTokensStatus>(address ? 'loading' : 'connect');
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        if (!address) {
            setTokens([]);
            setStatus('connect');
            setError(undefined);
            return;
        }

        const controller = new AbortController();
        const walletAddress = address;
        setStatus('loading');
        setError(undefined);

        async function loadTopTokens() {
            try {
                const response = await fetch(`/api/wallet-portfolio?wallet=${encodeURIComponent(walletAddress)}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });
                const payload = await response.json().catch(() => ({})) as WalletPortfolioResponse;

                if (!response.ok) {
                    throw new Error(payload.error || `Wallet portfolio returned ${response.status}`);
                }

                const nextTokens = Array.isArray(payload.tokens)
                    ? payload.tokens.filter(isWalletToken).slice(0, 5)
                    : [];
                setTokens(nextTokens);
                setStatus(nextTokens.length > 0 ? 'ready' : 'empty');
            } catch (caught) {
                if (controller.signal.aborted) return;
                setTokens([]);
                setStatus('error');
                setError(caught instanceof Error ? caught.message : 'Wallet token balances unavailable');
            }
        }

        void loadTopTokens();

        return () => controller.abort();
    }, [address]);

    return { tokens, status, error };
}
