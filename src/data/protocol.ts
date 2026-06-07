export type ContractLink = {
    label: string;
    address: `0x${string}`;
    snowtraceUrl: string;
};

export type PositionArtifact = {
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
    roundId: 2,
    targetAvax: 5000,
    priceAvax: 0.0035,
    minAvax: 0.1,
    maxAvax: 500,
    networkLabel: 'Avalanche Mainnet',
    contributionAsset: 'AVAX',
} as const;

export const ROUND_PROCEEDS_ALLOCATION = {
    roundId: 2,
    fullCapAvax: 5000,
    teamWallet: '0x5cA0A679025B6c7dA08a70be3b244399fF0D7813',
    buckets: [
        {
            label: 'Strategy/card acquisition treasury',
            percent: 85,
            fullCapAvax: 4250,
            detail: 'Primary treasury for card acquisition and strategy execution.',
        },
        {
            label: 'Liquidity',
            percent: 10,
            fullCapAvax: 500,
            detail: 'At full cap: 250 AVAX to LFJ LP and 250 AVAX to Pharaoh LP.',
        },
        {
            label: 'Team wallet',
            percent: 5,
            fullCapAvax: 250,
            detail: 'Sent to the team wallet after Round 2 finalizes and used for bootstrapping expenses.',
        },
    ],
    realizedProfitWaterfall: 'Round proceeds are separate from sale-profit routing. A card sale starts with imported venue evidence, settled proceeds on Avalanche, and stable proceeds confirmed to the fund. Principal restores liquid treasury first. Any realized profit then routes through the current market snapshot into card-buying power, LP support, or buyback-and-burn reserve. Routine holder claims are disabled.',
} as const;

export const ROUND_2_CLOSE_LEDGER = {
    roundId: 2,
    raisedAvax: 1353.9836,
    targetAvax: 5000,
    finalizedBlock: 85655273,
    finalizedAtLabel: 'May 17, 2026',
    raisedLabel: '1,353.9836 AVAX',
    targetLabel: '5,000 AVAX',
    progressLabel: '27.1%',
    rows: [
        {
            label: 'Finalized raise',
            value: '1,353.9836 AVAX',
            detail: 'Round 2 closed and finalized on Avalanche mainnet.',
        },
        {
            label: 'Strategy treasury',
            value: '1,150.8861 AVAX',
            detail: '85% of proceeds stayed with the strategy for card sourcing and execution.',
        },
        {
            label: 'LFJ liquidity route',
            value: '67.6992 AVAX',
            detail: 'One half of the liquidity bucket routed into LFJ.',
        },
        {
            label: 'Pharaoh liquidity route',
            value: '67.6992 AVAX',
            detail: 'One half of the liquidity bucket routed into Pharaoh.',
        },
        {
            label: 'Team allocation',
            value: '67.6992 AVAX',
            detail: '5% bootstrap allocation sent to the team wallet.',
        },
    ],
} as const;

export const FINALIZED_RAISE_ARCHIVE = {
    totalAvax: 1853.9836,
    commitmentUsd: 17461.77,
    commitmentUsdLabel: '$17,461.77',
    displayUsdLabel: '$17,462',
    source: '66 Investment events priced with the Avalanche AVAX/USD feed at each commitment block.',
    rounds: [
        {
            roundId: 1,
            eventCount: 28,
            raisedAvax: 500,
            commitmentUsd: 4704.17,
            firstBlock: 82862935,
            lastBlock: 83021043,
        },
        {
            roundId: 2,
            eventCount: 38,
            raisedAvax: 1353.9836,
            commitmentUsd: 12757.59,
            firstBlock: 83096311,
            lastBlock: 84691319,
        },
    ],
} as const;

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
        title: '🏆 The grails are out of reach',
        body: 'A single trophy-tier slab can cost more than most people will spend on cards in a lifetime. Building a diversified position at that tier is harder.',
    },
    {
        title: '💎 Scarcity drives the premium',
        body: 'Top-grade copies of iconic cards trade in a different band than raw copies. Fewer exist, more collectors want them, and comps keep moving.',
    },
    {
        title: '🚪 GM10 opens the door',
        body: 'One fund, one token, one strategy. No solo card-picking, storage or exit negotiations — just shared exposure to the top of the market.',
    },
] as const;

export const THESIS_EVIDENCE: readonly EvidenceStat[] = [
    {
        label: 'Record public sale',
        value: '$16.5M',
        takeaway: 'Pikachu Illustrator PSA 10. Goldin Auctions, February 2026. The most expensive Pokémon card ever sold — and proof the ceiling keeps moving.',
        sourceLabel: 'Goldin Auctions',
        sourceUrl: 'https://goldin.co',
    },
    {
        label: 'Grade premium',
        value: '$8.7k–$13.9k',
        takeaway: 'PSA 10 Base Set Charizard trades at multiples of a raw copy. The grade creates the premium.',
        sourceLabel: 'PriceCharting',
        sourceUrl: 'https://www.pricecharting.com/game/pokemon-base-set/charizard-4',
    },
    {
        label: 'Population scarcity',
        value: '77 PSA 10s',
        takeaway: '8,125 graded copies of Neo Genesis Lugia exist. Only 77 earned a perfect 10. Less than 1%.',
        sourceLabel: 'PriceCharting',
        sourceUrl: 'https://www.pricecharting.com/pop/set/pokemon-neo-genesis',
    },
    {
        label: 'Modern chase premium',
        value: '$1.7k–$3.4k',
        takeaway: 'Umbreon VMAX BGS 9.5 comps prove that modern cards can hold a meaningful premium at the top grade.',
        sourceLabel: 'PriceCharting',
        sourceUrl: 'https://www.pricecharting.com/game/pokemon-evolving-skies/umbreon-vmax-215',
    },
] as const;

export const EXPOSURE_STEPS: readonly ExposureStep[] = [
    {
        title: '🪙 Commit continuously',
        body: 'The fixed raise is archived. New entry uses the continuous round: supported routes settle on Avalanche, then $CATCH mints per commit at the live NAV-derived price.',
    },
    {
        title: '🃏 We acquire the cards',
        body: 'GM10 targets verified, high-grade slabs with clear provenance, visible comps, and recorded execution proofs from supported marketplaces.',
    },
    {
        title: '📊 $CATCH tracks it all',
        body: 'One token tracks every commit, holding, realized exit, market-support reserve, and conservative reference NAV as the strategy evolves.',
    },
] as const;

export const TOKEN_ALLOCATION = [
    {
        label: 'Commit buyers',
        percent: 95.24,
        color: 'from-sky-500 to-cyan-400',
        detail: 'Every successful continuous commit mints buyer tokens from settled value. There is no max supply reserve.',
    },
    {
        label: 'Core Team',
        percent: 0.95,
        color: 'from-red-500 to-orange-400',
        detail: 'Minted as 1% of each successful commit’s buyer tokens and excluded from circulating holder supply at the wallet level.',
    },
    {
        label: 'Governance Treasury',
        percent: 0.95,
        color: 'from-indigo-500 to-blue-500',
        detail: 'Minted as 1% of each successful commit’s buyer tokens for audits, legal, integrations, and operations.',
    },
    {
        label: 'Community & Ecosystem',
        percent: 0.95,
        color: 'from-emerald-500 to-teal-400',
        detail: 'Minted as 1% of each successful commit’s buyer tokens for collector campaigns and community activations.',
    },
    {
        label: 'Advisors',
        percent: 0.95,
        color: 'from-fuchsia-500 to-pink-400',
        detail: 'Minted as 1% of each successful commit’s buyer tokens for specialist contributors.',
    },
    {
        label: 'Strategic Partnerships',
        percent: 0.95,
        color: 'from-violet-500 to-purple-400',
        detail: 'Minted as 1% of each successful commit’s buyer tokens for marketplace, ecosystem, and growth partnerships.',
    },
] as const;

export const TOKEN_RELEASE_RULES = [
    ['Commit buyers', 'Minted from settled continuous commit value.'],
    ['Core Team', '1% of buyer tokens minted at each successful commit.'],
    ['Governance Treasury', '1% of buyer tokens minted at each successful commit.'],
    ['Community & Ecosystem', '1% of buyer tokens minted at each successful commit.'],
    ['Advisors', '1% of buyer tokens minted at each successful commit.'],
    ['Strategic Partnerships', '1% of buyer tokens minted at each successful commit.'],
] as const;

export const WATERFALL = [
    {
        label: 'Buying power',
        percent: 34,
        routeLabel: 'Snapshot-routed',
        color: 'from-sky-400 to-blue-500',
        detail: 'Restored after principal when the router keeps realized profit available for new card execution.',
    },
    {
        label: 'LP support',
        percent: 33,
        routeLabel: 'When accrued',
        color: 'from-emerald-400 to-teal-500',
        detail: 'Released as explicit market support, split into AVAX/WAVAX and CATCH legs, then deployed across LFJ and Pharaoh.',
    },
    {
        label: 'Buyback-burn reserve',
        percent: 33,
        routeLabel: 'Conditional',
        color: 'from-cyan-400 to-sky-500',
        detail: 'Reserved only when the market snapshot justifies discount support through CATCH buyback and burn.',
    },
] as const;

export const PURCHASE_FLOW = [
    {
        title: 'A commit settles on Avalanche',
        detail: 'Continuous commits do not wait for a close. Supported source-chain routes settle first, then the per-commit mint and routing stay inspectable from the public proof surface.',
    },
    {
        title: 'Card targets get greenlit',
        detail: 'Post-close execution remains ops-led: grails, slabs, provenance, price discipline, and venue-specific execution plans across Courtyard and future marketplaces.',
    },
    {
        title: 'Ops secures the slab',
        detail: 'Execution is operator-assisted and proof-backed. Courtyard is the first supported marketplace workflow, with room for others to follow.',
    },
    {
        title: 'The scoreboard updates onchain',
        detail: 'Positions, marks, sale receipts, LP funding, and wallet reporting route back to Avalanche mainnet so the run stays transparent.',
    },
] as const;

export const SALE_FLOW = [
    {
        title: 'Import the sale evidence',
        detail: 'The operator starts from the venue transaction, matches the sold token to the registry position, and generates the sale key from the proof trail.',
    },
    {
        title: 'Settle proceeds to Avalanche',
        detail: 'A sale is not finalized while funds are still on a marketplace rail. Stable proceeds must land on Avalanche and be confirmed against the sale key.',
    },
    {
        title: 'Finalize with a market snapshot',
        detail: 'The architecture-aware path restores principal first, then uses live market inputs to decide how realized profit should be routed.',
    },
    {
        title: 'Execute market support when accrued',
        detail: 'LP support is an execution step, not a label. Released support buys AVAX/WAVAX and CATCH legs, then adds liquidity across the configured LFJ and Pharaoh venues.',
    },
] as const;

export const GOVERNANCE_PHASES = [
    {
        phase: 'Operator-led',
        title: 'Centralized card selection',
        detail: 'The founding team picks targets while the portfolio is small. Speed and disciplined execution matter most at this stage.',
    },
    {
        phase: 'Community signal',
        title: 'Offchain community selection',
        detail: 'Token holders propose and vote on card targets offchain. The team still executes, but holders start setting the direction.',
    },
    {
        phase: 'Onchain control',
        title: 'Onchain enforcement',
        detail: 'Buy and sell decisions move into contract-enforced governance. No single party can override a valid vote.',
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
        question: 'What am I buying with GM10?',
        answer: 'GM10 is onchain exposure to a managed portfolio of trophy-grade Pokemon cards. You are buying access to the strategy, not a claim on a single slab.',
    },
    {
        question: 'What does $CATCH represent?',
        answer: '$CATCH is the token that tracks the Gem Mint Strategy. It reflects round participation, marked holdings, sale settlement, and realized-profit routing as the portfolio evolves.',
    },
    {
        question: 'Why not buy cards directly?',
        answer: 'Direct card ownership means sourcing, authenticity checks, insured storage, pricing discipline, and exit negotiation. GM10 packages those jobs into one managed position.',
    },
    {
        question: 'Why use Avalanche for this?',
        answer: 'Avalanche is the transparency layer for round accounting, contract execution, and public reporting. It keeps the strategy inspectable instead of trust-me opaque.',
    },
    {
        question: 'How is value tracked if cards do not trade every day?',
        answer: 'GM10 marks positions from executed trades first, then comparable sales, then conservative listing-band fallbacks. The system is designed to be public and disciplined, not optimistic.',
    },
    {
        question: 'What is live today versus planned later?',
        answer: 'The continuous round is the current entry mechanic. Round 2 is finalized and archived; public proof links, token accounting, sale evidence import, liquidity routing, holder dashboards, and reference NAV reporting remain inspectable.',
    },
    {
        question: 'How do continuous commits route value?',
        answer: 'Each verified commit routes native AVAX into the fund proxy, prices that AVAX as USDC-equivalent value on Avalanche, mints buyer $CATCH immediately at the live NAV-derived price, and records the commit route separately from sale-profit support. Card-sale profit uses a different path: proceeds settle back to Avalanche, principal is restored first, and realized profit routes from the current market snapshot.',
    },
    {
        question: 'Does GM10 guarantee returns?',
        answer: 'No. GM10 offers exposure to a thesis and an execution process, not guaranteed performance. Card prices, exit timing, and liquidity can all move against the fund.',
    },
] as const;

export type SiteNavItem = {
    to: string;
    label: string;
};

export const GLOBAL_CTA_ROUTE = '/fundraising' as const;

export function getRoundPrimaryCtaLabel(_isRoundOpen: boolean) {
    return 'Mint new $CATCH';
}

export const PUBLIC_NAV_LINKS: readonly SiteNavItem[] = [
    { to: '/fundraising', label: 'Mint $CATCH' },
    { to: '/catch', label: 'How It Works' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/holders', label: 'Holders' },
    { to: '/faq', label: 'FAQ' },
] as const;

export const FOOTER_EXPLORE_LINKS: readonly SiteNavItem[] = [
    { to: '/catch', label: 'How It Works' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/holders', label: 'Holders' },
    { to: '/faq', label: 'FAQ' },
] as const;

export const HOME_PROOF_STRIP = [
    {
        label: 'Asset thesis',
        value: '$16.5M peak sale',
        detail: 'Pikachu Illustrator PSA 10 · Goldin Auctions, Feb 2026 — the most expensive Pokemon card ever sold, and proof the ceiling keeps moving.',
    },
    {
        label: 'Public mechanics',
        value: 'Continuous mint logic',
        detail: 'Per-commit accounting, sale settlement, contract links, and proof surfaces are designed to stay inspectable on Avalanche mainnet.',
    },
    {
        label: 'Execution layer',
        value: 'Built on Avalanche',
        detail: 'The strategy settles on transparent onchain rails instead of spreadsheet-only reporting.',
    },
] as const;

export const HOME_MARKET_REASONS = [
    {
        title: 'A niche market with visible price ceilings',
        body: 'The highest-grade grails have public comps, headline sales, and scarcity dynamics that already look like a real asset class, not a hobby-only curiosity.',
    },
    {
        title: 'Scarcity compounds at the top grade',
        body: 'The spread between raw, mid-grade, and elite-grade copies can be enormous. GM10 is built around the part of the market where scarcity matters most.',
    },
    {
        title: 'Collectors pay for provenance and condition',
        body: 'The best opportunities come from verified slabs with clear history, recognizable demand, and comparable exits. That is where GM10 concentrates.',
    },
] as const;

export const HOME_GM10_ADVANTAGES = [
    {
        title: 'Skip the operational burden',
        body: 'You do not need to source inventory, validate provenance, or manage insured storage just to get exposure.',
    },
    {
        title: 'Stay diversified at the right end of the market',
        body: 'A single trophy-tier card can cost more than most investors want tied to one collectible. GM10 lets one position cover the broader strategy.',
    },
    {
        title: 'Keep the strategy inspectable',
        body: 'Commit state, holdings, sale settlement, LP support, and fund mechanics live on Avalanche so diligence does not stop at a PDF deck.',
    },
] as const;

export const HOME_INVESTOR_OBJECTIONS = [
    {
        question: 'Why not just buy one good card?',
        answer: 'Because one card still leaves you with concentration risk plus all of the operational work. GM10 spreads that work across a managed strategy.',
    },
    {
        question: 'How do I know the marks are not inflated?',
        answer: 'GM10 uses executed trades first, comparable sales second, and conservative fallbacks last. The valuation logic is part of the public system story.',
    },
    {
        question: 'What proves the system is ready for mainnet?',
        answer: 'The V8 continuous round is verified on mainnet, while the finalized Round 2 close remains public proof of contract-enforced routing. The sale workflow starts from venue evidence instead of spreadsheet entry. Inspect the contracts on Snowtrace.',
    },
    {
        question: 'Why does Avalanche matter here?',
        answer: 'Avalanche gives the fund a transparent settlement and reporting layer. The site can point to live contracts instead of asking visitors to trust an opaque back office.',
    },
] as const;

export const SUPPORT_PAGE_COPY = {
    fundraising: {
        eyebrow: 'Continuous round',
        title: 'Commit continuously. The proof stays live.',
        body: 'Preview the NAV-derived mint, review the value routing, and inspect Avalanche mainnet proof for the active continuous round.',
        primaryCtaTo: '/fundraising',
        secondaryCtaTo: '/fundraising#proof',
    },
    portfolio: {
        eyebrow: 'Portfolio',
        title: 'See what GM10 is targeting and why it fits the strategy.',
        body: 'The portfolio page explains how GM10 thinks about grails, modern momentum, and price visibility before a card ever enters the fund.',
        primaryCtaTo: GLOBAL_CTA_ROUTE,
        secondaryCtaTo: '/fundraising#proof',
    },
    catch: {
        eyebrow: 'How it works',
        title: 'A TCG strategy designed to accrue value to $CATCH.',
        body: 'This page shows how Gem Mint Strategy turns one token into portfolio exposure, valuation discipline, sale settlement, and market-support execution.',
        primaryCtaTo: GLOBAL_CTA_ROUTE,
        secondaryCtaTo: '/fundraising#proof',
    },
    faq: {
        eyebrow: 'FAQ',
        title: 'The investor questions that need short answers.',
        body: 'Use this page to pressure-test what GM10 is, what $CATCH tracks, why Avalanche matters, and how the continuous round operates on mainnet.',
        primaryCtaTo: GLOBAL_CTA_ROUTE,
        secondaryCtaTo: '/fundraising#proof',
    },
} as const;
