import { createPeerExtensionSdk, type PeerExtensionSdk } from '@zkp2p/sdk';
import { useEffect, useMemo, useRef, useState } from 'react';

const AVALANCHE_NATIVE_AVAX = '43114:0x0000000000000000000000000000000000000000';
const PEER_INSTALL_COPY = 'A funding wallet that lets you go from fiat to crypto in seconds, without additional verification.';
const PEER_REFERRER = 'GM10';
const PEER_REFERRER_LOGO = 'https://gm10.xyz/brand/logo.png';

type PeerOnrampButtonProps = {
    recipientAddress?: string;
    className?: string;
    helperText?: string;
};

function createBrowserPeerSdk(): PeerExtensionSdk | null {
    if (typeof window === 'undefined') return null;
    return createPeerExtensionSdk({ window });
}

export function PeerOnrampButton({ recipientAddress, className, helperText }: PeerOnrampButtonProps) {
    const peerSdk = useMemo(createBrowserPeerSdk, []);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
        };
    }, []);

    function registerFulfillmentListener() {
        if (!peerSdk) return;

        unsubscribeRef.current?.();
        unsubscribeRef.current = peerSdk.onIntentFulfilled((result) => {
            if (result.bridge.status === 'pending') {
                setMessage(result.bridge.trackingUrl ? `Bridge pending: ${result.bridge.trackingUrl}` : 'Bridge pending. Track the transfer in Peer.');
                return;
            }

            setMessage(`Peer funding complete: ${result.intentHash}`);
        });
    }

    async function handleOnramp() {
        if (!peerSdk) {
            setMessage('Peer is available from a browser session.');
            return;
        }

        setMessage(null);

        try {
            const state = await peerSdk.getState();

            if (state === 'needs_install') {
                setShowInstallModal(true);
                return;
            }

            if (state === 'needs_connection') {
                const approved = await peerSdk.requestConnection();
                if (!approved) {
                    setMessage('Connect the Peer extension to continue.');
                    return;
                }
            }

            registerFulfillmentListener();
            peerSdk.onramp({
                toToken: AVALANCHE_NATIVE_AVAX,
                ...(recipientAddress && { recipientAddress }),
                referrer: PEER_REFERRER,
                referrerLogo: PEER_REFERRER_LOGO,
            });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Peer could not start.');
        }
    }

    return (
        <>
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={handleOnramp}
                    className={className ?? 'v2-mono text-[0.95rem] font-semibold tracking-[0.03em] text-[var(--accent-brass)] transition-colors hover:text-[var(--text-primary)]'}
                >
                    <span>Fund with Peer</span>
                </button>
                {helperText ? (
                    <p className="text-[0.78rem] leading-[1.5] text-[var(--ink-muted)]">{helperText}</p>
                ) : null}
                {message ? (
                    <p className="v2-mono text-[0.76rem] leading-[1.5] text-[var(--ink-muted)]">{message}</p>
                ) : null}
            </div>

            {showInstallModal ? (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="peer-install-title"
                        className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                    >
                        <h3 id="peer-install-title" className="text-lg font-bold text-[var(--text-primary)]">
                            Install Peer
                        </h3>
                        <p className="mt-3 text-[0.92rem] leading-[1.6] text-[var(--ink-muted)]">
                            {PEER_INSTALL_COPY}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => peerSdk?.openInstallPage()}
                                className="rounded-lg bg-[var(--accent-brass)] px-4 py-2 text-sm font-semibold text-black"
                            >
                                Install Extension
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowInstallModal(false)}
                                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
