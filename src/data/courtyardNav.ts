export type CourtyardProfileNav = {
    source: 'courtyard';
    netWorthUsd?: number;
    fetchedAt: string;
    profileUrl: string;
    status: 'available' | 'unavailable';
    reason?: string;
};

const MONEY_PATTERN = /\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/gi;
const LABELED_NAV_PATTERNS = [
    /(?:net\s*worth|portfolio\s*value|collection\s*value|estimated\s*value)[^$]{0,180}\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/i,
    /"(?:netWorth|net_worth|portfolioValue|portfolio_value|collectionValue|collection_value|estimatedValue|estimated_value)"\s*:\s*"?\$?([0-9][0-9,]*(?:\.[0-9]{1,2})?)([KMB])?/i,
];

export function parseMoneyAmount(rawAmount: string, suffix?: string) {
    const parsed = Number(rawAmount.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return undefined;

    const multiplier = suffix?.toUpperCase() === 'B'
        ? 1_000_000_000
        : suffix?.toUpperCase() === 'M'
            ? 1_000_000
            : suffix?.toUpperCase() === 'K'
                ? 1_000
                : 1;

    return parsed * multiplier;
}

export function extractCourtyardNetWorthUsd(html: string) {
    for (const pattern of LABELED_NAV_PATTERNS) {
        const match = pattern.exec(html);
        const value = match ? parseMoneyAmount(match[1], match[2]) : undefined;
        if (value !== undefined) return value;
    }

    const nearbyNetWorth = html.match(/net\s*worth[\s\S]{0,400}/i)?.[0];
    if (!nearbyNetWorth) return undefined;

    const amounts = Array.from(nearbyNetWorth.matchAll(MONEY_PATTERN))
        .map((match) => parseMoneyAmount(match[1], match[2]))
        .filter((value): value is number => value !== undefined);

    return amounts[0];
}

export function unavailableCourtyardNav(profileUrl: string, reason: string): CourtyardProfileNav {
    return {
        source: 'courtyard',
        fetchedAt: new Date().toISOString(),
        profileUrl,
        status: 'unavailable',
        reason,
    };
}
