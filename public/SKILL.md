# GM10

GM10 is an Avalanche-based Pokemon-card protocol built around high-grade slabs, transparent onchain accounting, and a public website that explains the mechanics instead of flattening them into generic fund copy.

## Product posture

- The public `Buy` page stays on Fuji testnet for now.
- Public mainnet fundraising terms are **not** ready to be shown as if they are live.
- The core story is still exposure to **high-grade Pokemon cards**.
- Tokenized rails and venues like Courtyard are execution infrastructure, not the primary brand story.

## Contract architecture

The live upgrade path is:

- `GemMintStrategyFundV1.sol`
- `GemMintStrategyFundV2.sol`
- `GemMintStrategyFundV3.sol`

V3 is being refactored into a slimmer proxy implementation plus companion modules:

- `GemMintStrategyFundV3`
  - token logic
  - fundraising rounds
  - treasury buckets
  - stable NAV summary values
  - roles and failsafe
  - pointers to companion modules
- `Gm10PortfolioRegistry`
  - purchase authorizations
  - sale authorizations
  - collectible positions
  - valuation observations
  - history events for the frontend
- `Gm10InvestorAccounting`
  - direct-wallet cost basis
  - attributable holdings
  - transfer adjustments
  - wallet PnL views
- `CatchOFTAdapter`
  - LayerZero OFT adapter for the existing token
  - separate from the fund proxy

## Important engineering caveat

`GemMintStrategyFundV3.sol` is still above the EIP-170 mainnet code-size limit after the first split. The current refactor has already pushed workflow state and wallet accounting into companion contracts, but more slimming is still required before the final proxy implementation is deployable on mainnet.

## Naming and data conventions

- Legacy pre-rename references should not remain anywhere in active codepaths or public docs.
- `Card.vaultLocation` has been clarified to `Card.marketplaceProvenance`.
- The V3 position field is `marketplaceProvenanceRef`.
- `marketplaceId` identifies the venue.
- `marketplaceProvenance` / `marketplaceProvenanceRef` identifies the specific vault, listing, or settlement reference.

## Pricing and NAV

- Stable accounting is normalized into USDT-style 6-decimal values.
- AVAX contributions are normalized through a local Chainlink price-feed interface:
  - `IChainlinkPriceFeed.sol`
  - methods used: `decimals()` and `latestRoundData()`
- NAV policy:
  - exact trade first
  - strong comparable sales second
  - conservative listing-band fallback last
  - capped inferred moves for non-exact marks

## Governance phases

- Round 1: manager-led, community-guided
- Rounds 2-3: hybrid governance
- Later phase: fuller onchain governance with timelock discipline

## $CATCH tokenomics

Final allocation:

- `40%` Fundraising Rounds Reserve
- `12%` Community & Ecosystem
- `13%` Governance Treasury
- `15%` Core Team
- `10%` Liquidity & Market Structure
- `5%` Advisors & Specialist Contributors
- `5%` Strategic Partnerships

Release / vesting:

- Core Team: `6-month cliff`, then `42 months` linear vesting
- Advisors: `6-month cliff`, then `24 months` linear vesting
- Fundraising reserve: released only as rounds are opened
- Governance treasury: timelocked or governance-controlled
- Liquidity bucket: released only when liquidity is actually seeded or expanded
- Community bucket: progressive release
- Strategic partnerships: approved partnership allocations only

Sale proceeds split after principal recovery:

- `40%` treasury reinvestment
- `25%` buyback and burn
- `20%` CATCH / AVAX LP
- `15%` redemption reserve

## Website copy rules

- Do not flatten the product into bland fund language.
- Avoid `investor` / `investors` on public-facing pages.
- Prefer `holders`, `collectors`, `members`, `participants`, or `you`.
- Keep graded Pokemon cards front and center.
- Keep recent public comps visible for the featured slabs:
  - Charizard 1st Edition Base Set PSA 10
  - Umbreon VMAX BGS 10 Black Label
  - Lugia Neo Genesis PSA 9

## Scripts

Use explicit scripts only:

- `contracts/scripts/deployProxy.js`
- `contracts/scripts/upgradeProxy.js`
- `contracts/scripts/deployOftAdapter.js`

The old `contracts/scripts/deploy.js` wrapper should not come back.
