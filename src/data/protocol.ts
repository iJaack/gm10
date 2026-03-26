export const BUY_PAGE_DEFAULTS = {
    targetAvax: 10_000,
    priceAvax: 0.0025,
    minAvax: 0.1,
    maxAvax: 200,
    networkLabel: 'Fuji testnet',
    contributionAsset: 'AVAX',
} as const;

export const RECENT_CARD_COMPS = [
    {
        id: 'charizard',
        name: 'Charizard',
        subtitle: '1st Edition Base Set',
        grade: 'PSA 10',
        priceLabel: '$550,000',
        recencyLabel: 'Dec 2025 public auction comp',
        venue: 'Heritage',
    },
    {
        id: 'umbreon',
        name: 'Umbreon VMAX',
        subtitle: 'Evolving Skies',
        grade: 'BGS 10 Black Label',
        priceLabel: '$7,621',
        recencyLabel: 'Mar 2026 visible comp',
        venue: 'PriceCharting',
    },
    {
        id: 'lugia',
        name: 'Lugia',
        subtitle: 'Neo Genesis',
        grade: 'PSA 9',
        priceLabel: '~$2,100',
        recencyLabel: 'Oct-Nov 2025 visible comps',
        venue: 'PriceCharting',
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
        status: 'Targeted',
        recentComp: '$550,000',
        note: 'Blue-chip Charizard exposure stays front and center, with the tokenized rail acting as the execution path.',
    },
    {
        name: 'Moonbreon momentum',
        chain: 'Ethereum',
        venue: 'Price-visible secondary rails',
        status: 'Tracked',
        recentComp: '$7,621',
        note: 'Modern black-label demand is volatile, so the comp set matters just as much as the venue.',
    },
    {
        name: 'Neo Genesis Lugia',
        chain: 'Ethereum',
        venue: 'Collector rails',
        status: 'Tracked',
        recentComp: '~$2,100',
        note: 'Vintage-era liquidity is thinner, which is why provenance and conservative marking stay part of the story.',
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
        question: 'Is GM10 about generic collectibles now?',
        answer: 'No. The pitch is still high-grade Pokemon cards. Tokenized rails like Courtyard and similar venues are execution infrastructure, not the core identity.',
    },
    {
        question: 'Why does the public Buy page still say Fuji?',
        answer: 'Because that is the live public flow today. The site should not pretend the first mainnet round is already open before it is actually ready to be announced.',
    },
    {
        question: 'How is NAV updated?',
        answer: 'Executed buys and sales write through immediately. Unsold positions are marked conservatively using exact trades first, strong comps second, and capped listing-band fallback last.',
    },
    {
        question: 'What happens after a profitable sale?',
        answer: 'Principal goes back first. Realized profit is then forced into a 40% treasury, 25% buyback-and-burn, 20% LP, and 15% redemption-reserve split.',
    },
    {
        question: 'What does governance look like early on?',
        answer: 'Round 1 is manager-led with community input. Rounds 2 and 3 are meant to move into hybrid governance where mandates and budgets go onchain before the system graduates into fuller DAO control.',
    },
] as const;
