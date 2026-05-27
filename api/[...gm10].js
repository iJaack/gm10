import lifiQuotes from '../apps/admin/api/lifi-quotes.js';
import courtyardDeals from '../apps/admin/api/courtyard-deals.js';
import courtyardAsset from '../apps/admin/api/courtyard-asset.js';
import valuationPack from '../apps/admin/api/valuation-pack.js';
import lifiStatus from '../apps/admin/api/lifi-status.js';
import lifiSolanaQuote from '../apps/admin/api/lifi-solana-quote.js';
import phygitalsCard from '../apps/admin/api/phygitals-card.js';
import valuationPublic from '../apps/admin/api/valuation-public.js';
import valuationCron from '../apps/admin/api/valuation-cron.js';
import continuousCommitRoute from '../src/server/api/continuous-commit-route.js';
import nftMetadata from '../src/server/api/nft-metadata.js';
import walletPortfolio from '../src/server/api/wallet-portfolio.js';
import courtyardProfileNav from '../src/server/api/courtyard-profile-nav.js';

const routeHandlers = {
    'continuous-commit-route': continuousCommitRoute,
    'courtyard-asset': courtyardAsset,
    'courtyard-deals': courtyardDeals,
    'courtyard-profile-nav': courtyardProfileNav,
    'lifi-quotes': lifiQuotes,
    'lifi-solana-quote': lifiSolanaQuote,
    'lifi-status': lifiStatus,
    'nft-metadata': nftMetadata,
    'phygitals-card': phygitalsCard,
    'valuation-cron': valuationCron,
    'valuation-pack': valuationPack,
    'valuation-public': valuationPublic,
    'wallet-portfolio': walletPortfolio,
};

function firstSegment(value) {
    if (Array.isArray(value)) return value[0];
    if (typeof value === 'string') return value.split('/')[0];
    return undefined;
}

function resolveRouteName(request) {
    const catchAllRoute = firstSegment(request.query?.gm10);
    if (catchAllRoute) return catchAllRoute;

    const url = new URL(request.url ?? '/', 'https://gm10.local');
    const [, routeName] = url.pathname.match(/^\/api\/([^/]+)/) ?? [];
    return routeName ? decodeURIComponent(routeName) : '';
}

export default async function handler(request, response) {
    const routeName = resolveRouteName(request);
    const routeHandler = routeHandlers[routeName];

    if (!routeHandler) {
        response.status(404).json({ error: `Unknown API route: ${routeName || 'missing'}` });
        return;
    }

    return routeHandler(request, response);
}
