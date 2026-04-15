import { useEffect } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

export function SafeAppBootstrap() {
    useEffect(() => {
        const sdk = new SafeAppsSDK({ debug: false });

        if (window.parent !== window) {
            sdk.safe.getInfo().catch(() => {
                // Outside a Safe iframe this can time out. The bootstrap still
                // registers the SDK message handler for Safe custom-app checks.
            });
        }
    }, []);

    return null;
}
