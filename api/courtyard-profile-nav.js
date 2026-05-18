const PROFILE_URL = 'https://courtyard.io/user/gm10xyz/collection';
const MONEY_PATTERN = /\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/gi;
const LABELED_NAV_PATTERNS = [
    /(?:net\s*worth|portfolio\s*value|collection\s*value|estimated\s*value)[^$]{0,180}\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/i,
    /"(?:netWorth|net_worth|portfolioValue|portfolio_value|collectionValue|collection_value|estimatedValue|estimated_value)"\s*:\s*"?\$?([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/i,
];

function parseMoneyAmount(rawAmount, suffix) {
    const parsed = Number(String(rawAmount).replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return undefined;

    const normalizedSuffix = String(suffix || '').toUpperCase();
    const multiplier = normalizedSuffix === 'B'
        ? 1_000_000_000
        : normalizedSuffix === 'M'
            ? 1_000_000
            : normalizedSuffix === 'K'
                ? 1_000
                : 1;

    return parsed * multiplier;
}

function extractCourtyardNetWorthUsd(html) {
    for (const pattern of LABELED_NAV_PATTERNS) {
        const match = pattern.exec(html);
        const value = match ? parseMoneyAmount(match[1], match[2]) : undefined;
        if (value !== undefined) return value;
    }

    const nearbyNetWorth = html.match(/net\s*worth[\s\S]{0,400}/i)?.[0];
    if (!nearbyNetWorth) return undefined;

    const amounts = Array.from(nearbyNetWorth.matchAll(MONEY_PATTERN))
        .map((match) => parseMoneyAmount(match[1], match[2]))
        .filter((value) => value !== undefined);

    return amounts[0];
}

function unavailable(reason) {
    return {
        source: 'courtyard',
        fetchedAt: new Date().toISOString(),
        profileUrl: PROFILE_URL,
        status: 'unavailable',
        reason,
    };
}

export default async function handler(_request, response) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    response.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');

    try {
        const courtyardResponse = await fetch(PROFILE_URL, {
            signal: controller.signal,
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!courtyardResponse.ok) {
            response.status(200).json(unavailable(`Courtyard returned ${courtyardResponse.status}`));
            return;
        }

        const html = await courtyardResponse.text();
        const netWorthUsd = extractCourtyardNetWorthUsd(html);

        if (netWorthUsd === undefined) {
            response.status(200).json(unavailable('Courtyard net worth was not found in the profile payload'));
            return;
        }

        response.status(200).json({
            source: 'courtyard',
            netWorthUsd,
            fetchedAt: new Date().toISOString(),
            profileUrl: PROFILE_URL,
            status: 'available',
        });
    } catch (error) {
        response.status(200).json(unavailable(error instanceof Error ? error.message : 'Courtyard NAV request failed'));
    } finally {
        clearTimeout(timeout);
    }
}
