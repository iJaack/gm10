import { useEffect, useState } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

type SafeAppInfo = {
    chainId?: number;
    safeAddress?: string;
    isSafeApp: boolean;
    isLoading: boolean;
    timedOut?: boolean;
    error?: string;
};

const listeners = new Set<(info: SafeAppInfo) => void>();
let sharedInfo: SafeAppInfo | undefined;
let loadPromise: Promise<void> | undefined;
const SAFE_APP_INFO_TIMEOUT_MS = 4_000;

function defaultInfo(): SafeAppInfo {
    return {
        isSafeApp: false,
        isLoading: typeof window !== 'undefined' && window.parent !== window,
    };
}

function setSharedInfo(info: SafeAppInfo) {
    sharedInfo = info;
    listeners.forEach((listener) => listener(info));
}

function loadSafeAppInfo() {
    if (typeof window === 'undefined') {
        setSharedInfo({ isSafeApp: false, isLoading: false });
        return;
    }

    if (window.parent === window) {
        setSharedInfo({ isSafeApp: false, isLoading: false });
        return;
    }

    if (sharedInfo?.timedOut) {
        return;
    }

    if (loadPromise) return;

    if (!sharedInfo || !sharedInfo.isLoading) {
        setSharedInfo({
            chainId: sharedInfo?.chainId,
            safeAddress: sharedInfo?.safeAddress,
            isSafeApp: sharedInfo?.isSafeApp ?? false,
            isLoading: true,
            timedOut: false,
        });
    }

    const sdk = new SafeAppsSDK({ debug: false });
    const safeInfoPromise = sdk.safe
        .getInfo()
        .then((safeInfo) => {
            setSharedInfo({
                chainId: Number(safeInfo.chainId),
                safeAddress: safeInfo.safeAddress,
                isSafeApp: true,
                isLoading: false,
                timedOut: false,
            });
            return 'resolved' as const;
        })
        .catch(() => {
            if (sharedInfo?.isLoading) {
                setSharedInfo({ isSafeApp: false, isLoading: false });
            }
            return 'failed' as const;
        });

    const timeoutPromise = new Promise<'timeout'>((resolve) => {
        window.setTimeout(() => resolve('timeout'), SAFE_APP_INFO_TIMEOUT_MS);
    });

    loadPromise = Promise.race([safeInfoPromise, timeoutPromise])
        .then((result) => {
            if (result === 'timeout' && sharedInfo?.isLoading) {
                setSharedInfo({
                    isSafeApp: false,
                    isLoading: false,
                    timedOut: true,
                    error: 'Safe app context timed out.',
                });
            }
        })
        .finally(() => {
            loadPromise = undefined;
        });
}

export function useSafeAppInfo(): SafeAppInfo {
    const [info, setInfo] = useState<SafeAppInfo>(() => sharedInfo ?? defaultInfo());

    useEffect(() => {
        listeners.add(setInfo);
        if (sharedInfo) {
            setInfo(sharedInfo);
        }
        loadSafeAppInfo();

        return () => {
            listeners.delete(setInfo);
        };
    }, []);

    return info;
}
