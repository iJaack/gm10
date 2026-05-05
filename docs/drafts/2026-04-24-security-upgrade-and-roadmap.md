# GM10 mainnet security upgrade

GM10 completed a mainnet security upgrade for the core fund proxy.

This was not a homepage redesign or a new card page. The visible product is mostly the same: the dashboard still loads, the proxy address is unchanged, Round 2 state is still live, and the existing portfolio positions are still part of the system.

The upgrade is lower in the stack. It changes how the protocol handles purchase funding, sale proceeds, custody references, settlement checks, and holder-facing accounting.

That is the part that matters for a tokenized card treasury. If the system is tracking real assets, then the workflow needs to be clear about what happened, what is only recorded as provenance, and what is actually allowed to affect fund accounting.

The short version: GM10 is still the same product, but the fund workflow is harder to bypass and easier to audit.

## What changed

The upgraded system now runs through `GemMintStrategyFundV6` on Avalanche mainnet, backed by a migrated V2-compatible portfolio registry.

Live contracts:

- Fund proxy: `0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f`
- Current implementation: `0x593225fB004B5692EF96Cd01A44dCde29ebDD3e3`
- Portfolio Registry V2, migrated with existing positions: `0x0fCbce2341E3682AB92f1cAabDF976E17D91436A`
- Legacy registry, retained for audit history: `0x02962F73AdFAA792636c62d3D2a76d922c6B052c`

There were two follow-up repair transactions after the security upgrade:

- Legacy fund storage repair: `0x3dc7f816b3a01fbaa143d8fb0ba011f08f41536108d3bea5a449b0e276277023`
- Registry V2 migration and pointer update: `0x389f558b1c9049c4d70d26acb8a0303ac40b4943928fc6c4155793ae6ae04ad2`

The storage repair restored the live fundraising state after the upgrade exposed an old layout mismatch. Round 2 is active again through the current V6 getters, with `1,347.9836 AVAX` raised toward the `5,000 AVAX` cap at the time of repair.

The repair did not replace the fund implementation. The proxy returned to the same V6 implementation after the storage copy completed.

The registry migration moved the existing 8 portfolio positions from the legacy registry into a V2-compatible registry, verified each position, and then switched the fund pointer to the migrated registry.

So the system now has the upgraded workflow surface without losing the existing portfolio history.

## The completed fixes

The upgrade shipped several concrete fixes:

- The OFT adapter can no longer rescue the canonical CATCH token that backs remote supply.
- Purchase funding moved from a release-first flow into a confirmation-backed flow.
- Bridge operations are no longer an arbitrary normal-path operator control.
- Sale proceeds no longer become accounting value just because a manager attests them.
- AVAX sale settlement now depends on a fresher, bounded oracle quote.
- USDC settlement is explicitly allowlisted and balance checked.
- External proceeds on another chain or in another token can be recorded as provenance, but remain pending until normalized into verified fund custody.
- Legacy fundraising state and stable accounting were copied into the current storage layout so future upgrades preserve round integrity.
- Registry V2 now starts from the existing portfolio state instead of an empty fresh deployment.
- Holder dashboards now derive upgrade-safe accounting from the V6 surface instead of assuming old helper getters still exist.

The main theme is separation.

Authorization is not movement. Movement is not custody. Custody is not settlement. Settlement is not accounting until the protocol can verify that value returned to the fund in an approved form.

That sounds obvious, but it is exactly where fund-like systems can get messy.

If accounting moves before settlement, NAV can reflect value that is not actually under fund control. If holder distributions move before proceeds are normalized, downstream numbers become less trustworthy. If bridge or sale flows are too broad, operator permissions become a substitute for protocol state.

The upgrade tightens those boundaries.

## Purchase and sale workflow

The admin console now follows the asset lifecycle more closely.

A normal purchase flow is:

1. authorize the purchase
2. move or bridge funds
3. confirm funding
4. execute the buy
5. detect custody
6. record execution
7. record the position

The sale flow follows the same discipline in reverse.

Executing a sale is not the same thing as receiving proceeds. Receiving external proceeds is not the same thing as recognizing fund value. Recording provenance is not the same thing as updating holder balances.

The protocol can now preserve those intermediate states without pretending they are final accounting events.

That is the useful upgrade: the system can record more of the real workflow while still refusing to count value too early.

## Holder dashboard accounting

The public holder dashboard was updated around the same V6 surface.

V6 does not expose the old separate `profitDistributor()`, `referenceNavPerTokenUsdt6()`, or `profitEligibleSupply18()` helpers, so the dashboard now builds from the accounting data that exists on the upgraded fund:

- Reference NAV uses `navPerTokenUsdt6()` as the current onchain baseline.
- Live NAV is recomputed from liquid treasury plus card marks divided by minted supply.
- Profit-eligible supply is derived from total minted CATCH minus protocol-owned and LP balances.
- Holder profit is shown only from realized holder-profit accounting.
- APR stays unavailable until realized holder profit exists.
- LFJ and Pharaoh liquidity views are pinned to live pool addresses, not confused with protocol-owned LP.

There are no realized sale profits in the holder bucket yet, so the public holder-profit value remains `$0.00` and APR is intentionally unavailable.

This is not a missing number. It is the correct number for the current state.

## The profit waterfall

Once sale proceeds are settled and verified, realized profit routes through the updated split:

- 25% returns to the treasury for reinvestment.
- 40% becomes available to holders through the future claim/distribution system.
- 35% is reserved for liquidity pool replenishment.

The liquidity portion splits into CATCH and AVAX legs. Half is used to market buy CATCH, half is used to buy or retain AVAX, and then liquidity is added across LFJ and Pharaoh.

LFJ LP is burned. Pharaoh CL positions are locked to the configured permanent owner.

The important part is the timing. The waterfall only applies after proceeds are settled and verified.

External proceeds in another token or on another chain can be recorded for provenance. That is useful because history matters. But provenance is not recognized fund value. It does not inflate NAV. It does not create a holder claim bucket. It does not refill liquidity until it becomes an approved settlement asset in verified custody.

No settlement, no accounting.

## What comes next

The next phase is to extend the same evidence requirements across more of the protocol.

Marketplace execution comes first. Courtyard-style workflows are now the regression fixture for purchase authorization, funding confirmation, custody proof, and sale settlement. Every new venue needs the same checklist:

- marketplace approval
- custody reference
- fee handling
- settlement proof
- valuation source
- fallback handling

The goal is not to support every marketplace as quickly as possible. The goal is to add venues only when custody, valuation, and settlement can be explained and audited.

veCATCH and gauges are still on the roadmap, but they need the same treatment. Locked CATCH can create voting weight and distribution eligibility, but the mechanics need to be explicit before public actions go live: lock rules, gauge design, distribution logic, exclusions, claim flows, and tests around edge cases.

Realized-profit distributions should depend on settled proceeds, not manager-entered numbers.

The max-supply review is also still planned, not finalized. Any supply change has to be modeled against holders, treasury flexibility, liquidity depth, governance power, staking, and future rounds.

No tokenomics update should ship as vibes.

The same applies to treasury strategy expansion. Delta-neutral or partner-led pilots can make sense, but only with clear risk caps: maximum exposure, accepted collateral, unwind path, pause authority, reporting cadence, and public performance review.

Partner strategies should graduate into gauges only after the reporting process is proven.

## The direction

This upgrade does not make GM10 finished.

It makes the next set of upgrades easier to reason about.

Marketplace expansion, holder distributions, gauges, and broader governance all depend on the same base requirement: the protocol should not count value before settlement, and public dashboards should not show more certainty than the contracts can support.

That is the practical direction from here.

More proof surfaces. Cleaner registry-backed workflows. Settlement-backed accounting. Dashboards that reflect the actual protocol state.

Prove custody. Prove settlement. Account only for verified value. Then build on top.
