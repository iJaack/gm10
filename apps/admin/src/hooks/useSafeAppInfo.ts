import { useEffect, useState } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

type SafeAppInfo = {
    chainId?: number;
    safeAddress?: string;
    isSafeApp: boolean;
    isLoading: boolean;
};

export function useSafeAppInfo(): SafeAppInfo {
    const [info, setInfo] = useState<SafeAppInfo>({
        isSafeApp: false,
        isLoading: typeof window !== 'undefined' && window.parent !== window,
    });

    useEffect(() => {
        if (window.parent === window) {
            setInfo({ isSafeApp: false, isLoading: false });
            return;
        }

        let cancelled = false;
        const sdk = new SafeAppsSDK({ debug: false });
        sdk.safe
            .getInfo()
            .then((safeInfo) => {
                if (cancelled) return;
                setInfo({
                    chainId: Number(safeInfo.chainId),
                    safeAddress: safeInfo.safeAddress,
                    isSafeApp: true,
                    isLoading: false,
                });
            })
            .catch(() => {
                if (cancelled) return;
                setInfo({ isSafeApp: false, isLoading: false });
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return info;
}
