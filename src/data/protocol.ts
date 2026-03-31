export type FujiContractLink = {
    label: string;
    address: `0x${string}`;
    snowtraceUrl: string;
};

export type FujiPositionArtifact = {
    positionId: number;
    chain: string;
};

export type EvidenceStat = {
    label: string;
    value: string;
    takeaway: string;
    sourceLabel: string;
    sourceUrl: string;
};

export type ThesisPillar = {
    title: string;
    body: string;
};

export type ExposureStep = {
    title: string;
    body: string;
};

export const SITE_LINKS = {
    x: 'https://x.com/gm10xyz',
    github: 'https://github.com/iJaack/gm10',
} as const;

export const BUY_PAGE_DEFAULTS = {
    targetAvax: 10_000,
    priceAvax: 0.0025,
    minAvax: 0.1,
    maxAvax: 200,
    networkLabel: 'Fuji testnet',
    contributionAsset: 'AVAX',
} as const;

export const FUJI_PRIMARY_DEPLOYMENT = {
    proxy: {
        label: 'Fund proxy',
        address: '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
    },
    portfolioRegistry: {
        label: 'Portfolio registry',
        address: '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
    },
    investorAccounting: {
        label: 'Wallet accounting',
        address: '0x526a0DeBfEF61966060342C2b12ae0325cffA210' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0x526a0DeBfEF61966060342C2b12ae0325cffA210',
    },
} as const;

export const FUJI_PURCHASE_TEST_DEPLOYMENT = {
    proxy: {
        label: 'Fund proxy',
        address: '0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9',
    },
    portfolioRegistry: {
        label: 'Portfolio registry',
        address: '0x79678b78f7c2b8099bBd18d6754891774632F8F4' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0x79678b78f7c2b8099bBd18d6754891774632F8F4',
    },
    investorAccounting: {
        label: 'Wallet accounting',
        address: '0x99EdFdF5785EE56A1E126ee72ee3D9694c262a91' as const,
        snowtraceUrl: 'https://testnet.snowtrace.io/address/0x99EdFdF5785EE56A1E126ee72ee3D9694c262a91',
    },
} as const;

export const FUJI_CONTRACTS = FUJI_PRIMARY_DEPLOYMENT;
export const FUJI_PURCHASE_TEST_CONTRACTS = FUJI_PURCHASE_TEST_DEPLOYMENT;
export const FUJI_TEST_POSITION_IDS = [1, 2] as const;

export const FUJI_TEST_PORTFOLIO_ARTIFACTS: readonly FujiPositionArtifact[] = [
    {
        positionId: 1,
        chain: 'Avalanche Fuji',
    },
    {
        positionId: 2,
        chain: 'Avalanche Fuji',
    },
] as const;

export const RECENT_CARD_COMPS = [
    {
        id: 'charizard',
        name: 'Charizard',
        subtitle: '1st Edition Base Set',
        grade: 'PSA 10',
        imageSrc: '/images/cards/charizard_psa10.png',
        imageAlt: '1st Edition Base Set Charizard PSA 10 slab',
        priceLabel: '$550,000',
        recencyLabel: 'Dec 2025 public auction comp',
        venue: 'Heritage',
    },
    {
        id: 'umbreon',
        name: 'Umbreon VMAX',
        subtitle: 'Evolving Skies',
        grade: 'BGS 10 Black Label',
        imageSrc: '/images/cards/umbreon_vmax_bgs.png',
        imageAlt: 'Umbreon VMAX BGS 10 Black Label slab',
        priceLabel: '$7,621',
        recencyLabel: 'Mar 2026 visible comp',
        venue: 'PriceCharting',
    },
    {
        id: 'lugia',
        name: 'Lugia',
        subtitle: 'Neo Genesis',
        grade: 'PSA 9',
        imageSrc: '/images/cards/lugia_psa9.png',
        imageAlt: 'Neo Genesis Lugia PSA 9 slab',
        priceLabel: '~$2,100',
        recencyLabel: 'Oct-Nov 2025 visible comps',
        venue: 'PriceCharting',
    },
] as const;

export const THESIS_PILLARS: readonly ThesisPillar[] = [
    {
        title: 'Elite cards are hard to reach alone',
        body: 'The cards with the strongest scarcity and collector signal usually cost too much for most people to buy casually, let alone build a basket around.',
    },
    {
        title: 'The top end behaves differently',
        body: 'Iconic high-grade cards tend to command outsized premiums because the best copies are scarce, recognizable, and easy for collectors to compare.',
    },
    {
        title: 'GM10 turns that into shared exposure',
        body: 'Instead of picking, grading, storing, and exiting cards alone, people can follow the same run through one community fund and one token layer.',
    },
] as const;

export const THESIS_EVIDENCE: readonly EvidenceStat[] = [
    {
        label: 'Record high-end demand',
        value: '$550,000',
        takeaway: 'A PSA 10 1st Edition Base Set Charizard set a fresh public record sale at Heritage on December 16, 2025.',
        sourceLabel: 'Heritage, December 16, 2025',
        sourceUrl: 'https://comics.ha.com/heritage-auctions-press-releases-and-news/-550-000-psa-10-charizard-breaks-record-leads-all-time-high-5.27-million-total-at-heritage-trading-card-games-auction.s?releaseId=5371',
    },
    {
        label: 'Top-grade premium below trophy tier',
        value: '$8.7k-$13.9k',
        takeaway: 'Recent PSA 10 Base Set Charizard sales still sit in a very different band from raw or lower-grade copies.',
        sourceLabel: 'PriceCharting, Charizard #4',
        sourceUrl: 'https://www.pricecharting.com/game/pokemon-base-set/charizard-4',
    },
    {
        label: 'Scarcity at the top grade',
        value: '77 PSA 10s',
        takeaway: 'PriceCharting shows Neo Genesis Lugia #9 with 8,125 graded copies total, but only 77 in PSA 10.',
        sourceLabel: 'PriceCharting, Neo Genesis population',
        sourceUrl: 'https://www.pricecharting.com/pop/set/pokemon-neo-genesis',
    },
    {
        label: 'Modern grails still command a premium',
        value: '$1.7k-$3.4k',
        takeaway: 'Recent BGS 9.5 Umbreon VMAX #215 sales show that modern chase cards can still hold a meaningful high-grade premium.',
        sourceLabel: 'PriceCharting, Umbreon VMAX #215',
        sourceUrl: 'https://www.pricecharting.com/game/pokemon-evolving-skies/umbreon-vmax-215',
    },
] as const;

export const EXPOSURE_STEPS: readonly ExposureStep[] = [
    {
        title: 'Join the round',
        body: 'People join the GM10 round with test AVAX on Fuji today, and later rounds open the same exposure path on mainnet.',
    },
    {
        title: 'GM10 chases elite slabs',
        body: 'The fund targets scarce, high-grade Pokemon cards instead of asking each person to pick and manage cards by themselves.',
    },
    {
        title: '$CATCH follows the run',
        body: '$CATCH sits next to entries, holdings, exits, and the upside path as the strategy compounds and matures.',
    },
] as const;

export const TOKEN_ALLOCATION = [
    {
        label: 'Fundraising Rounds Reserve',
        percent: 40,
        color: 'from-sky-500 to-cyan-400',
        detail: 'Reserved for Round 1 and later governance-approved rounds. This is the main public distribution bucket.',
    },
    {
        label: 'Core Team',
        percent: 15,
        color: 'from-red-500 to-orange-400',
        detail: 'Builder allocation with a 6-month cliff and 42 months of linear vesting after that.',
    },
    {
        label: 'Governance Treasury',
        percent: 13,
        color: 'from-indigo-500 to-blue-500',
        detail: 'Held for audits, legal, integrations, infrastructure, and future governance-approved expansion.',
    },
    {
        label: 'Community & Ecosystem',
        percent: 12,
        color: 'from-emerald-500 to-teal-400',
        detail: 'Collector campaigns, collaborations, referrals, and community activations around GM10.',
    },
    {
        label: 'Liquidity & Market Structure',
        percent: 10,
        color: 'from-amber-500 to-yellow-400',
        detail: 'Reserved for CATCH/AVAX liquidity support and onchain market structure as the token expands.',
    },
    {
        label: 'Advisors',
        percent: 5,
        color: 'from-fuchsia-500 to-pink-400',
        detail: 'For specialist contributors across legal, technical, marketplace, and collectible work.',
    },
    {
        label: 'Strategic Partnerships',
        percent: 5,
        color: 'from-violet-500 to-purple-400',
        detail: 'Used for marketplace, ecosystem, and growth partnerships that materially improve sourcing or reach.',
    },
] as const;

export const TOKEN_RELEASE_RULES = [
    ['Fundraising Rounds Reserve', 'Released only as rounds are opened.'],
    ['Core Team', '6-month cliff, then 42 months linear vesting.'],
    ['Advisors', '6-month cliff, then 24 months linear vesting.'],
    ['Governance Treasury', 'Timelocked or governance-controlled.'],
    ['Liquidity & Market Structure', 'Released only when liquidity is actually seeded or expanded.'],
    ['Community & Ecosystem', 'Progressive release, not fully live at launch.'],
    ['Strategic Partnerships', 'Released only for approved partnership allocations.'],
] as const;

export const WATERFALL = [
    { label: 'Treasury reinvestment', percent: 40, color: 'from-sky-400 to-blue-500' },
    { label: 'Buyback and burn', percent: 25, color: 'from-cyan-400 to-sky-500' },
    { label: 'CATCH / AVAX LP', percent: 20, color: 'from-emerald-400 to-teal-500' },
    { label: 'Redemption reserve', percent: 15, color: 'from-amber-400 to-orange-500' },
] as const;

export const PURCHASE_FLOW = [
    {
        title: 'The buy page gets charged up',
        detail: 'The live page runs on Fuji today. Test AVAX mints CATCH while the public-facing mainnet launch stays under wraps.',
    },
    {
        title: 'Card targets get greenlit',
        detail: 'The early governance path is still Pokemon-first: grails, slabs, provenance, price discipline, and venue-specific execution plans.',
    },
    {
        title: 'Ops secures the slab',
        detail: 'Execution can happen through rails like Courtyard or other collectible venues, but the target is still the card itself, not the marketplace.',
    },
    {
        title: 'The scoreboard updates onchain',
        detail: 'Positions, marks, sale receipts, and wallet reporting all route back to Avalanche so the run stays transparent.',
    },
] as const;

export const SALE_FLOW = [
    {
        title: 'A card gets marked for exit',
        detail: 'The future governance flow decides when a slab should be moved, not just what gets bought.',
    },
    {
        title: 'The exit happens on the right venue',
        detail: 'Sales execute where the buyer is, whether that is a tokenized rail, a settlement venue, or a native collectible marketplace.',
    },
    {
        title: 'Proceeds land back on Avalanche',
        detail: 'Nothing counts until the money is back on the canonical scoreboard.',
    },
    {
        title: 'Principal first, profit next',
        detail: 'Once principal is restored, realized profit is forced into treasury, buyback, LP, and reserve buckets.',
    },
] as const;

export const PORTFOLIO_PREVIEW = [
    {
        name: 'Charizard grail lane',
        chain: 'Ethereum',
        venue: 'Courtyard',
        status: 'Target lane',
        recentComp: '$550,000',
        note: 'A big Charizard target. The card matters more than the rail used to get it.',
    },
    {
        name: 'Moonbreon momentum',
        chain: 'Ethereum',
        venue: 'Secondary market',
        status: 'Tracked lane',
        recentComp: '$7,621',
        note: 'A fast-moving modern target. The latest comp matters as much as where it trades.',
    },
    {
        name: 'Neo Genesis Lugia',
        chain: 'Ethereum',
        venue: 'Collector rail',
        status: 'Tracked lane',
        recentComp: '~$2,100',
        note: 'A vintage Lugia target. Thin liquidity means provenance and pricing need extra care.',
    },
] as const;

export const SAMPLE_HISTORY = {
    buys: [
        { date: 'Target lane', item: '1st Edition Base Set Charizard PSA 10', amount: '$550,000', chain: 'Ethereum', venue: 'Courtyard / vault rail' },
        { date: 'Tracked lane', item: 'Umbreon VMAX BGS 10 Black Label', amount: '$7,621', chain: 'Ethereum', venue: 'Price-visible secondary market' },
    ],
    sales: [
        { date: 'Worked example', item: 'Vintage grail exit', gross: '$120,000', net: '$110,000', pnl: '+$30,000' },
        { date: 'Worked example', item: 'Modern card exit', gross: '$42,000', net: '$38,000', pnl: '-$2,000' },
    ],
} as const;

export const FAQ_TOPICS = [
    {
        question: 'What is GM10?',
        answer: 'GM10 is a community fund built to give people proxy access to the upside of scarce, high-grade Pokemon cards without making them buy and manage the cards directly.',
    },
    {
        question: 'What does $CATCH actually do?',
        answer: '$CATCH is the tokenized way to follow and participate in the GM10 card run. It sits next to entries, holdings, exits, and the upside path as the system matures.',
    },
    {
        question: 'Why not just buy cards directly?',
        answer: 'Because buying elite slabs directly means handling card selection, grading risk, storage, provenance, liquidity, and very high ticket sizes on your own. GM10 turns that into shared exposure.',
    },
    {
        question: 'Why focus on expensive high-grade cards?',
        answer: 'Because the strongest cards usually have the clearest scarcity, the most visible collector demand, and the least room for supply to expand. GM10 is built around that top-end part of the market.',
    },
    {
        question: 'Why is the live Buy page still on Fuji?',
        answer: 'Because Fuji is where the public mechanics are live today. It lets people inspect the flow before the public mainnet launch is presented as open.',
    },
    {
        question: 'Does GM10 guarantee gains?',
        answer: 'No. GM10 is about exposure to a strategy and an asset class, not guaranteed returns. Market evidence supports the thesis, but prices can still move against the fund.',
    },
    {
        question: 'How do the live Fuji holdings fit in?',
        answer: 'They show that GM10 can already authorize a buy, release funds, and record NFT positions onchain through the modular Fuji stack.',
    },
] as const;
