# Changelog

## 2026-05-18

### Gem Mint Strategy tokenomics V7 is live

Gem Mint Strategy just shipped the biggest `$CATCH` tokenomics upgrade so far.

The old model was simple, but too rigid for a strategy fund that grows round by round. V7 removes the fixed max supply and replaces it with dynamic issuance tied directly to completed fundraising rounds.

From now on, every finalized round mints the tokens sold to buyers, then mints five recurring segment allocations equal to 1% each of the buyer tokens sold in that round:

- Core Team
- Governance Treasury
- Community & Ecosystem
- Advisors
- Strategic Partnerships

This is not a frontend-only change. The important constraints moved onchain.

`GemMintStrategyFundV7` now handles uncapped round-based issuance, segment minting, and attribution-gated redemption. Tokens can still transfer and vote normally, but only attributable investor balances can redeem. Segment-origin and secondary-market-only tokens cannot use redemption as a backdoor claim on fund assets.

`Gm10TokenomicsV7Controller` now manages the five segment wallets and profit-share exclusions onchain. Segment wallets are excluded from profit-share supply by contract state, not by UI assumptions or admin spreadsheet logic.

The public site, holder dashboard, fundraising copy, admin console, and roadmap were updated away from the old fixed 100M supply model. The upgrade script was also hardened for Safe execution and resumable deployment, because this path touches the live fund proxy and cannot depend on fragile local state.

The Avalanche upgrade is complete:

- Fund proxy: `0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f`
- V7 controller: `0x65acE06bbc9e079321451FAfaaD7C58223b20b26`
- V7 implementation: `0x9b5b2eb5A2D517F5bfE76784a47651B5CD99a438`
- Safe upgrade tx: `0x6ee5c96427584ba8a98c06e8628606a3113ce395eddc7b9877ee801287c1488e`
- Confirmed block: `85734654`

Regression coverage was added for the V6 to V7 upgrade path, segment minting, cap-close investor attribution ordering, voting and transfer behavior, profit-share exclusion, and redemption rejection for non-attributable balances.
