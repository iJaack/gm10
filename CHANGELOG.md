# Changelog

## 2026-05-18

### Dynamic tokenomics V7

- Added `GemMintStrategyFundV7` with uncapped round-based issuance: finalized rounds mint buyer tokens from actual sold allocation, then mint five segment allocations equal to 1% each.
- Added `Gm10TokenomicsV7Controller` for onchain segment-recipient configuration and profit-share exclusion.
- Added attribution-gated redemption so non-attributable transferred tokens and segment-origin tokens cannot redeem.
- Updated public, holder, fundraising, admin, and roadmap copy away from fixed 100M supply language.
- Added a Safe-oriented mainnet upgrade script for deploying the controller and V7 implementation.
- Added V7 upgrade, minting, exclusion, transfer/voting, and redemption regression tests.
