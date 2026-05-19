import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_V3_ABI } from '../data/contracts';
import { GM10_MARKET_CONFIG } from '../data/gm10Config';

const FALLBACK_PRICE = 9.5;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useAvaxPrice() {
    const { data } = useReadContract({
        address: GM10_MARKET_CONFIG.avaxUsdFeedAddress ?? ZERO_ADDRESS,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
        query: { enabled: Boolean(GM10_MARKET_CONFIG.avaxUsdFeedAddress) },
    });
    const answer = data?.[1];

    if (answer !== undefined && answer > 0n) {
        const price = Number(formatUnits(answer, 8));
        if (Number.isFinite(price) && price > 0) return price;
    }

    return FALLBACK_PRICE;
}
