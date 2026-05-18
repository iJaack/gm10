# Changelog

## 2026-05-18

### Dynamic tokenomics V7

- Added `GemMintStrategyFundV7` with uncapped round-based issuance: finalized rounds mint buyer tokens from actual sold allocation, then mint five segment allocations equal to 1% each.
- Added `Gm10TokenomicsV7Controller` for onchain segment-recipient configuration and profit-share exclusion.
- Added attribution-gated redemption so non-attributable transferred tokens and segment-origin tokens cannot redeem.
- Updated public, holder, fundraising, admin, and roadmap copy away from fixed 100M supply language.
- Added a Safe-oriented mainnet upgrade script for deploying the controller and V7 implementation.
- Added V7 upgrade, minting, exclusion, transfer/voting, and redemption regression tests.
- Deployed V7 on Avalanche: controller `0x65acE06bbc9e079321451FAfaaD7C58223b20b26`, implementation `0x9b5b2eb5A2D517F5bfE76784a47651B5CD99a438`, Safe upgrade tx `0x6ee5c96427584ba8a98c06e8628606a3113ce395eddc7b9877ee801287c1488e`.
