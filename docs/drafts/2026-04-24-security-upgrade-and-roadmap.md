# GM10 Mainnet Security Upgrade and the Roadmap Ahead

GM10 has completed a mainnet security upgrade for the core Avalanche fund proxy. The goal was simple: make the portfolio workflow harder to bypass, easier to audit, and better aligned with how real collectibles are bought, custodied, sold, and settled across marketplaces.

This was not a cosmetic release. It changed how purchase funding is confirmed, how sale proceeds become accounting value, and how the admin console guides operations from authorization through custody and settlement.

## What Changed

The upgraded system now runs through `GemMintStrategyFundV6` on Avalanche mainnet, backed by a migrated V2-compatible portfolio registry.

Live contracts:

- Fund proxy: `0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f`
- Current implementation: `0x593225fB004B5692EF96Cd01A44dCde29ebDD3e3`
- Portfolio Registry V2, migrated with existing positions: `0x0fCbce2341E3682AB92f1cAabDF976E17D91436A`
- Legacy registry, retained for audit history: `0x02962F73AdFAA792636c62d3D2a76d922c6B052c`

There were two follow-up repair transactions after the security upgrade:

- Legacy fund storage repair: `0x3dc7f816b3a01fbaa143d8fb0ba011f08f41536108d3bea5a449b0e276277023`
- Registry V2 migration and pointer update: `0x389f558b1c9049c4d70d26acb8a0303ac40b4943928fc6c4155793ae6ae04ad2`

The storage repair restored the live fundraising state after the upgrade exposed an old layout mismatch. Round 2 is active again through the current V6 getters, with `1,347.9836 AVAX` raised toward the `5,000 AVAX` cap at the time of repair. The repair did not replace the fund implementation; the proxy returned to the same V6 implementation after the storage copy completed.

The registry migration moved the existing 8 portfolio positions from the legacy registry into a V2-compatible registry, verified each position, and then switched the fund's registry pointer to the migrated registry. That keeps the new V2 workflow surface active without losing the existing portfolio history.

The upgrade shipped several important fixes:

1. The OFT adapter can no longer rescue the canonical CATCH token that backs remote supply.
2. Purchase funding moved from a release-first flow into a confirmation-backed flow.
3. Bridge operations are no longer an arbitrary normal-path operator control.
4. Sale proceeds no longer become accounting value just because a manager attests them.
5. AVAX sale settlement now depends on a fresher, bounded oracle quote.
6. USDC settlement is explicitly allowlisted and balance checked.
7. External proceeds on another chain or in another token can be recorded as provenance, but remain pending until normalized into verified fund custody.
8. Legacy fundraising state and stable accounting were copied into the current storage layout so future upgrades preserve round integrity.
9. Registry V2 now starts from the existing portfolio state instead of an empty fresh deployment.

The admin console was updated around the same lifecycle. Normal purchase execution now follows the real sequence: authorize the purchase, move or bridge funds, confirm funding, buy, detect custody, record execution, and record the position. Sale finalization remains disabled until proceeds are confirmed.

## Why This Matters

GM10 is not just a website showing graded cards. It is a treasury system where public dashboards, portfolio marks, holder accounting, and future distribution mechanics all depend on the accounting layer being honest about what actually happened.

The previous flow left too much room for privileged assertions:

- An operator could bridge fund-held tokens without being tightly bound to the purchase authorization.
- A manager could record sale proceeds before the fund had verified settlement.
- A rescue function could remove the canonical token from the OFT adapter.

Those are not acceptable defaults for a protocol moving from founder-led execution toward community-guided and eventually more onchain-enforced treasury controls.

The new model separates intent from settlement:

- Authorization says what may happen.
- Movement or marketplace execution proves what was attempted.
- Funding confirmation proves a purchase budget reached the expected destination.
- Sale settlement proves value actually returned to the fund.
- Only then can accounting, holder buckets, and liquidity buckets move.

That distinction is the main point of this upgrade.

## The Profit Waterfall

The sale waterfall is now structured around the updated split:

- 25% returns to the treasury for reinvestment.
- 40% becomes available to holders through the future claim/distribution system.
- 35% is reserved for liquidity pool replenishment.

The liquidity portion is intended to be split into CATCH and AVAX legs: half used to market buy CATCH, half used to buy or retain AVAX, then added as liquidity across LFJ and Pharaoh, with the LFJ LP burned.

The important constraint is that this split applies only after proceeds are settled and verified. External proceeds in another token or on another chain can be recorded for provenance, but they do not inflate NAV or claim buckets until normalized into an approved settlement asset.

## Roadmap Ahead

The next phase is about turning this safer settlement layer into a more complete operating system for the treasury.

### 1. Expand Marketplace Execution

Courtyard-style workflows are now the regression fixture for purchase authorization, funding confirmation, custody proof, and sale settlement. The next step is to expand beyond the first supported rails into additional collector and marketplace venues.

Every new venue needs the same checklist:

- marketplace approval
- custody reference
- fee handling
- settlement proof
- valuation source
- fallback handling

The goal is not to chase every marketplace. The goal is to add venues only when custody, valuation, and settlement can be explained and audited.

### 2. Launch veCATCH and Gauges Carefully

The staking direction remains a ve(3,3)-inspired model where locked CATCH creates voting weight and distribution eligibility.

Before public actions go live, the work still needs:

- lock mechanics
- gauge design
- distribution rules
- exclusion handling
- plain-English staking documentation
- production tests around claims and edge cases

This is where the security upgrade matters. Realized-profit distributions should depend on settled proceeds, not manager-entered numbers.

### 3. Review Tokenomics and Max Supply

The max-supply review is still planned, not finalized.

Any supply change needs to be modeled against holders, treasury flexibility, liquidity depth, governance power, staking, and future rounds. If mechanics change, public language needs to match the deployed contracts and migration path.

No tokenomics update should ship as vibes. It needs contract-enforceable mechanics and clear communication.

### 4. Expand Treasury Strategy With Risk Caps

The strategy roadmap includes research into delta-neutral and partner-led treasury pilots, including work with collector ecosystem partners.

Before any strategy receives treasury allocation, it needs defined risk caps:

- maximum exposure
- accepted collateral
- unwind path
- pause authority
- reporting cadence
- public performance review

Partner strategies should graduate into gauges only after the reporting and operating process is proven.

### 5. Continue Progressive Decentralization

The direction is still the same: move from ops-led execution to community-guided decisions, and then toward onchain-enforced treasury controls where the tooling supports it.

The near-term work is not to decentralize everything instantly. It is to keep replacing implicit trust with visible checks:

- public proof surfaces
- Safe and timelock discipline
- registry-backed workflows
- settlement-backed accounting
- clearer admin and holder dashboards
- roadmap items marked complete only when they are verifiable

## Closing

This upgrade makes GM10 less dependent on privileged assertions and more dependent on verifiable workflow state. That is the right foundation for marketplace expansion, holder distributions, liquidity replenishment, gauges, and broader governance.

The work ahead is still substantial, but the direction is cleaner: prove custody, prove settlement, account only for verified value, and then let the roadmap build on top of that.
