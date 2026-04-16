import { useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { avalanche } from 'wagmi/chains';
import type { ReactNode } from 'react';
import { GM10_NETWORK_LABEL } from '../data/gm10Config';

const REQUIRED_CHAIN_ID = avalanche.id;

type Props = { children: ReactNode };

export default function FujiGuard({ children }: Props) {
    const { isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const [dismissed, setDismissed] = useState(false);

    const showBanner =
        isConnected && chainId !== REQUIRED_CHAIN_ID && !dismissed;

    return (
        <>
            {showBanner && (
                <div
                    style={{
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Wrong network — this app runs on{' '}
                        <span style={{ color: 'var(--accent)' }} className="font-semibold">
                            {GM10_NETWORK_LABEL}
                        </span>
                        . Switch to Avalanche Mainnet to interact with the protocol.
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--text-primary)',
                            }}
                            className="px-3 py-1 rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity"
                        >
                            Switch Network
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            style={{ color: 'var(--text-secondary)' }}
                            className="hover:opacity-70 transition-opacity leading-none text-base font-bold px-1"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}
