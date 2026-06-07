# GM10 First Card Sale Workflow Log - 2026-06-06

This log tracks the first live card sale workflow so the admin flow can be tightened after execution.

## Sale Evidence

- Polygon sale tx: `0x286883812a8a8c019e282b29ee79eeea440d027b5d090caaa7256e2457837a18`
- PolygonScan: `https://polygonscan.com/tx/0x286883812a8a8c019e282b29ee79eeea440d027b5d090caaa7256e2457837a18`
- Tx status: successful.
- Block: `88046603`.
- Timestamp: `2026-06-06 19:41:30 UTC`.
- Sold asset: Courtyard ERC-721 from collection `0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD`.
- Token ID: `75865666224509731516199709831649452920632076644697988020915461938749434812407`.
- Seller hot wallet: `0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50`.
- Buyer: `0x6245d45C739487ca3A90F429471b7417916BB9D8`.
- Proceeds observed on Polygon: `1,900 USDC`.
- USDC token: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`.
- Proceeds receiver: `0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50`.

## Repo Parser Output

Command used:

```bash
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com rtk node --input-type=module
```

Parser result:

- Generated sale key label: `courtyard-sale-7-28688381`.
- Sale key bytes32: `0x30bd0102ad7e3e2cd5545e697b5169abfed18328d87ab70abcb7ee0f4953509b`.
- Matched registry position: `7`.
- Chain EID: `30109` (Polygon).
- Gross proceeds: `1900` USDT terms.
- Marketplace fees: `0`.
- Bridge fees: `0`.
- Net proceeds: `1900` USDT terms.
- Initial settlement mode: `external`.
- Source proceeds ref: sale tx hash.
- Proof ref: sale tx hash.

Important parser warning:

> This records Polygon hot-wallet proceeds as external pending. Bridge or transfer funds back to the Avalanche fund before confirming settled proceeds and finalizing.

## Registry Checks

- Portfolio registry: `0x0fCbce2341E3682AB92f1cAabDF976E17D91436A`.
- Fund proxy: `0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f`.
- `COURTYARD` marketplace ID: `0xe4be716b8167d4e645fe6ad884be4f88017bfa7c2c3ae1b127aadc4f6ca6e2d8`.
- `COURTYARD` marketplace approved: yes.
- Sale authorization status for generated sale key: `None`.
- Position `7` status before recording sale: `Active`.
- Position `7` acquisition price: `999` USDT.
- Position `7` current value / NAV mark: `999` USDT.

## Role Checks

Fund role checks:

- Treasury Safe `0x39971795266a794a8156271729A07994952a6FAD`
  - `DEFAULT_ADMIN_ROLE`: yes
  - `GOVERNANCE_ROLE`: yes
  - `MANAGER_ROLE`: yes
- Courtyard workflow `0x5448884263E8C27c87CCE6279faE8175271D131c`
  - `GOVERNANCE_ROLE`: yes
  - `MANAGER_ROLE`: yes
- Team wallet `0x5cA0A679025B6c7dA08a70be3b244399fF0D7813`
  - no admin/governance/manager role.
- Polygon hot wallet `0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50`
  - no admin/governance/manager role.

## Proposed Evidence-Side Calls

These calls record the sale and mark proceeds as external pending. They do not finalize sale accounting and do not claim Avalanche settlement has happened.

Superseded plan:

- The first prepared Safe JSON assumed `bridgeFeesUsdt6 = 0`.
- That is no longer valid because the executable Polygon-to-Avalanche route has protocol/bridge fees.
- Do not use the deleted `docs/operations/first-card-sale-evidence.safe.json` bundle.
- Evidence recording should happen after the bridge settles so `bridgeFeesUsdt6 = grossProceedsUsdt6 - settledAvalancheUsdcRaw`.

1. `authorizeSale`
   - Target: portfolio registry.
   - Role required: `GOVERNANCE_ROLE`.
   - Args:
     - sale key: `0x30bd0102ad7e3e2cd5545e697b5169abfed18328d87ab70abcb7ee0f4953509b`
     - position ID: `7`
     - marketplace ID: `0xe4be716b8167d4e645fe6ad884be4f88017bfa7c2c3ae1b127aadc4f6ca6e2d8`
     - min net proceeds: exact settled Avalanche USDC raw amount.
     - mandate hash: `0x286883812a8a8c019e282b29ee79eeea440d027b5d090caaa7256e2457837a18`
2. `recordSaleExecution`
   - Target: portfolio registry.
   - Role required: `MANAGER_ROLE`.
   - Args:
     - sale key: same as above.
     - gross proceeds: `1900000000`
     - marketplace fees: `0`
     - bridge fees: `1900000000 - settledAvalancheUsdcRaw`
     - execution ref: sale tx hash.
     - proceeds ref: bridge tx hash.
     - proof hash: bridge tx hash.
3. `recordExternalSaleProceeds`
   - Target: portfolio registry.
   - Role required: `MANAGER_ROLE`.
   - Args:
     - sale key: same as above.
     - source chain EID: `30109`
     - source token: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
     - source token amount: `1900000000`
     - source token decimals: `6`
     - source proceeds ref: sale tx hash.
     - proof hash: sale tx hash.

## Settlement-Side Execution

Polygon custody update:

- The `1,900 USDC` proceeds were transferred from the Polygon hot wallet to the Polygon Safe.
- Transfer tx: `0xc71b7684fb2cdbb35fbe15cad8faf6b2c14832bab1201b93d8787c8050ececeb`.
- Polygon Safe after transfer: `1,900 USDC`.
- Polygon hot wallet after transfer: `52.064521 USDC`.

Bridge execution:

- Hardhat Ledger signer discovery hung before script execution, so execution path switched to Foundry `cast --ledger`.
- Correct Ledger index for owner `0x5cA0A679025B6c7dA08a70be3b244399fF0D7813`: `4`.
- Polygon USDC approve tx from Safe to LI.FI spender `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`: `0xda1aaa50354324fbee4e226f233729da7725016c4da35f2121e7dcdf6554c374`.
- Polygon bridge tx through LI.FI/Mayan MCTP: `0xf06f633676baf50f6c4390e86d428953af5fd7bb7a91a961ea9e85cd2591002c`.
- Route: `mayanMCTP`.
- Source amount: `1,900 USDC`.
- Avalanche settlement transfer tx: `0x228335496e4357077da76d1fb6eb131a56f770cd5971eb5a83ade5d0babdb843`.
- Avalanche Safe received: `1,895.249872 USDC`.
- Bridge fees recorded: `4.750128 USDC`.
- Polygon Safe USDC after bridge: `0`.
- Avalanche Safe USDC after receipt: `1,895.249872`.

Finalization guardrail:

- The pre-existing live fund proxy implementation was `0xfb7e8713e1d3172d55fbca3567b2177c449d96e4`.
- It exposed `finalizeSaleWithMarketSnapshot(bytes32,address,MarketSnapshot)` but did not expose `confirmStableSaleProceeds(bytes32,address,uint256,bool,bytes32,bytes32)`.
- `GemMintStrategyFundV8` was patched to add the missing stable sale settlement entrypoint without storage changes.
- New V8 implementation: `0x4e572853dfe8f5f8b4a4025e49fbb69fed3c48d3`.
- Implementation deployment tx: `0x65e9d3e121704a343749ee6d42634864c6e4a183361b1fc927613bdd004da17c`.
- Proxy upgrade tx: `0x6586882ad028b6efe88891de7e9aa5bca91f51ec78f1ca8c4caae0e20eee83ee`.
- To follow the target continuous-accrual architecture, finalization should use `finalizeSaleWithMarketSnapshot` with the sale-profit router and a fresh market snapshot.
- Target architecture split applies to realized profit only: `net_sale_proceeds - cost_basis`.
- For this sale, realized profit is `1,895.249872 - 999 = 896.249872 USDC`.
- Sale-profit router deployed: `0x009c742f514c0f245d2c0d0380c0843b97e8dbfa`.
- Router deploy tx: `0x95a29b4a1ae571957b0e74ce347b6114928e6b065c7570bbe3e38c6e09f89219`.

Avalanche Safe transaction sequence:

1. `authorizeSale`
   - Tx: `0x293982a5fa97a1509f4165a21b138cc2b6b59297782fbf6977aafacc6b04f1e1`
   - Min net proceeds: `1895249872`
2. `recordSaleExecution`
   - Tx: `0x7872e1d48f4b6f2c3673eb844d8825397ca95e44621ac036a603e89d11ee0363`
   - Gross: `1900000000`
   - Marketplace fees: `0`
   - Bridge fees: `4750128`
3. `recordExternalSaleProceeds`
   - Tx: `0xa14f3bf2704fdbd41f12932293ef8e8e52deaff6e64b1f8a271991436c902f27`
4. Approve fund pull path
   - Tx: `0x09645cf53ddf500c508b3bfe2a66f211857a55f3243d2d4d9b74cf47d24f3c5c`
   - Later superseded by pre-funded settlement because the live V8 implementation lacked `confirmStableSaleProceeds`.
5. Transfer USDC from Safe to fund proxy
   - Tx: `0x6ffd614b4ac655dd79fbb85e87b4f77ebcec4f73a57a15a9ce7120d219c55cbf`
   - Amount: `1,895.249872 USDC`
6. Failed confirm attempt before upgrade
   - Tx: `0x50db16bbc0dfaca78e8d6fa9fd4df3c4429cd0f463850d5d0cd091bcb5a30983`
   - Status: reverted with `GS013`
   - Root cause: proxy implementation lacked `confirmStableSaleProceeds` selector.
7. Confirm stable sale proceeds after upgrade
   - Tx: `0xcf4d47a46b6516cb9b5e6450321236d7b87934ad362f1304329c7b5e1904cf82`
   - Amount: `1,895.249872 USDC`
   - Pull mode: `false`; funds were already in the fund proxy.
8. Finalize sale through architecture-aware router
   - Tx: `0xaa3a5dbbc974c32186e4d51a0ae3f4cff97831d4a4cfc8f3c8ec02a141531220`
   - Snapshot proof: `0x058fc37685cd51c05a893c5458027bbd5e8fb69ab90f70415c10567667a86fb6`
   - Snapshot values: neutral premium, `1000` LP coverage bps, `5000` slippage depth score bps, `1000` liquid treasury ratio bps, `8971` sale ROI bps.
   - Emitted route: `7500` reinvest bps, `2500` LP support bps, `0` buyback/burn bps.
9. Clear stale USDC allowance
   - Tx: `0x4226f4daf12832a4bb2678a1def6c88dcbf9ccea72ca9c3fa709f8bb6f8de37b`
   - Safe allowance to fund after cleanup: `0`.

Verified final state:

- Sale status: `Finalized`.
- Position `7` status: `Sold`.
- Position `7` current value: `0`.
- Position `7` last NAV mark: `0`.
- Sale net proceeds: `1,895.249872`.
- Fund USDC balance: `1,895.249872`.
- Avalanche Safe USDC balance: `0`.
- Safe allowance to fund: `0`.
- Accounted settlement balance for Avalanche USDC: `1,895.249872`.
- Holder distribution accrued: `0`.
- Buyback/burn accrued from this sale: `0`.
- LP support accrued total after sale: `264.257069`.
- Liquid treasury total after sale: `2,150.491116`.
- Canonical portfolio value after sale: `13,700.1`.

## LP Support Execution

Scope:

- LP support executed against the full current accrued LP-support bucket: `264.257069 USDC`.
- Split rule used for execution:
  - `132.128535 USDC` equivalent to AVAX-side support.
  - `132.128534 USDC` equivalent to CATCH-side support.
  - Venue split across LFJ and Pharaoh in equal USDC parts.
- Per-leg source amounts:
  - LFJ AVAX leg: `66.064268 USDC`.
  - Pharaoh WAVAX leg: `66.064267 USDC`.
  - LFJ CATCH leg: `66.064267 USDC`.
  - Pharaoh CATCH leg: `66.064267 USDC`.

Execution guardrail:

- The live V8 implementation recorded LP support through `executeLpSupport`, but it did not have a safe release path for accrued settlement-token LP-support funds.
- `GemMintStrategyFundV8` was patched to add `releaseLpSupportToken(...)`, which releases approved stable settlement tokens for LP execution without decrementing `lpSupportAccruedUsdt6`.
- Accounting is decremented only after the external LP operations are done through `executeLpSupport(...)`.
- New V8 implementation with LP release support: `0xbae4f2b306be5ad4ef7719e143fd6edbd775d8b5`.
- Implementation deployment tx: `0x583fbc0ac3fdffb595d70ad07265162e770da9c13984c733ee2e466b077e9592`.
- Proxy upgrade tx: `0xc51da18ed65793578314f8c0edb7ee5f4b54ba369d2aa1e270b6b285bc65c8e9`.

Fund release:

- Released `264.257069 USDC` from the fund proxy to the Avalanche Safe for LP execution.
- Release proof: `0x058fc37685cd51c05a893c5458027bbd5e8fb69ab90f70415c10567667a86fb6`.
- Release tx: `0xf5b78d7de4caf8e28d78be0181f3bb84e6974460b388dfac7afe5314fcca8feb`.
- Joe router USDC approval tx: `0xdd9ad6d2a011a95d4208ac77c72d980c9cbc8cd7f6b71f029e30c99d6bec550a`.

Swaps:

1. LFJ AVAX leg
   - Route: USDC to AVAX through LFJ/Joe.
   - Input: `66.064268 USDC`.
   - Output held by Safe: `9.947505086891309867 AVAX`.
   - Tx: `0xdd56a50f78c6d182bc3ba39c09cfc66ec80bd71b6db848d1eab6e5430af208c2`.
2. Pharaoh WAVAX leg
   - Route: USDC to WAVAX through LFJ/Joe.
   - Input: `66.064267 USDC`.
   - Output held by Safe: `9.939957899075627675 WAVAX`.
   - Tx: `0x31ea44f9001c78899f2ad9093be619e6a0fd376f1ed5b1e40411607df1b21614`.
3. LFJ CATCH leg
   - Route: USDC to WAVAX to CATCH through LFJ/Joe.
   - Input: `66.064267 USDC`.
   - Output held by Safe: `2,856.885787134488133862 CATCH`.
   - Tx: `0x56ef80b2c4afe2df37e263da8c258aad80d84c4fedf5e34671a5f159c08d2399`.
4. Pharaoh CATCH leg
   - Route: USDC to WAVAX to CATCH through LFJ/Joe.
   - Input: `66.064267 USDC`.
   - Output held by Safe: `2,531.933450148947202498 CATCH`.
   - Tx: `0xea871816b63b916ef967eb46ad2f3355c9054343a73711513d2f22ca918898b0`.

LFJ liquidity:

- CATCH approval to Joe tx: `0x790b3e946347b139bea736382e79b01a2a732700b470304fed12a53bfe176e7a`.
- Add-liquidity tx: `0x7129f55941291edc879aafaecc8f1ec622d81891e3b6d72ba04bf8c01cdf1879`.
- LP recipient: `0x000000000000000000000000000000000000dEaD`.
- CATCH used: `2,634.854145094355120099`.
- AVAX used: `9.947505086891309867`.
- CATCH not used because of pool ratio and returned to Safe: `222.031642040133013763`.

Pharaoh liquidity:

- CATCH approval to Pharaoh position manager tx: `0x7a802be1c079595d7415c7399780bb29e645b09b3c6f82720ae41ee7e077ceef`.
- WAVAX approval to Pharaoh position manager tx: `0x336915a8561f4d22fdceb2c9f3029c9e1f9842cf9940503a2201fee24bfc591e`.
- Mint tx: `0x074e7ce2ddd89b91d061c17ec9b9bba86354e84cc819975ac0ffc30a116500ae`.
- Pharaoh position manager: `0x0B4478e810D48B5882D4019D435A2f864Bab4F39`.
- Pharaoh pool: `0x1D4Cf678129cdDF63fBc31ca58cB24048955651f`.
- Minted NFT token ID: `298283`.
- NFT recipient: Avalanche Safe `0x39971795266a794a8156271729A07994952a6FAD`.
- Tick range: `-70000` to `-42000`.
- CATCH used: `2,531.933450148947202498`.
- WAVAX used: `9.319220835719408069`.
- WAVAX not used because of range/price math and returned to Safe: about `0.620737063356219606`.

Accounting and cleanup:

- LFJ pair address: `0xDc6523f6275bc91cEA2dE1C8e178B65da1F2ee53`.
- Set Pharaoh custody mode to `1` tx: `0x47403384aacddc3943916f6fa03c02f81526da16499065a28522308b8bed7ea9`.
- Temporarily unpause LP support tx: `0xb466a18d585594a4ba199a7d274f28f4ea3c98fe508695f2b9505657cdf14af3`.
- Record LFJ LP support tx: `0x2eeced0723d84e4f14e86f9c14aba1274718b8619f973255469c9be967e9c3f9`.
  - Venue: LFJ pair.
  - CATCH-side accounting amount: `66.064267 USDC`.
  - Paired-AVAX accounting amount: `66.064268 USDC`.
  - Custody mode: `0`.
  - Proof: `0xe927dd46ed6676e260549cbcb844801e6a566794e10c1be89e5940450814ecd8`.
- Record Pharaoh LP support tx: `0xc1f56a3759cdf0942bb0e6c4e1193b0f8bc0ebfa1584c2a61517ba124f9a015b`.
  - Venue: Pharaoh pool.
  - CATCH-side accounting amount: `66.064267 USDC`.
  - Paired-AVAX accounting amount: `66.064267 USDC`.
  - Custody mode: `1`.
  - Proof: `0x8b7bc0318c5eb0df7a01b0ebb9af159c2b463fb0ce609d312efa9e5a950950cf`.
- Re-pause LP support tx: `0xd59dc7c6373edcfcee86dce1be30e0809337b9db3e99c1dcf61f478c73ef7d6c`.
- Clear stale Joe CATCH allowance tx: `0x1035f0c1897e0b451e584bec5f1559c6a8ffe2370c1b126642803328f358722c`.
- Clear stale Pharaoh WAVAX allowance tx: `0x1f38c3ec57c26cdd999b6c57c5f0f6403e5bbdfcc6ac21bc9fd4d193e4cccfd4`.

Final LP-support verification:

- Fund implementation: `0xbae4f2b306be5ad4ef7719e143fd6edbd775d8b5`.
- Avalanche Safe nonce after cleanup: `162`.
- Safe USDC: `0`.
- Safe AVAX reserve: `2.478261383621813847`.
- Safe WAVAX remainder: `0.621293441366812329`.
- Safe CATCH remainder: `1,941.131645530902352678`.
- `lpSupportAccruedUsdt6`: `0`.
- `buybackBurnAccruedUsdt6`: `0`.
- `stableAccounting().canonicalPortfolioValue`: `13,700.1`.
- `stableAccounting().liquidTreasury`: `2,150.491116`.
- `continuousMintPaused`: `false`.
- `buybackPaused`: `true`.
- `lpSupportPaused`: `true`.
- `mintSpreadBps`: `-500`.
- LFJ custody mode: `0`.
- Pharaoh custody mode: `1`.
- USDC allowance to Joe: `0`.
- CATCH allowance to Joe: `0`.
- CATCH allowance to Pharaoh position manager: `0`.
- WAVAX allowance to Pharaoh position manager: `0`.

## Admin Flow Tweaks To Consider

- Expose RPC fallback or clearer error when default Polygon RPC returns `401 tenant disabled`.
- Show a post-import checklist with the three evidence-side calls and the later settlement-side calls separated.
- Label imported sales as `External proceeds pending` by default when proceeds are on Polygon.
- Add an explicit "Do not finalize yet" warning until Avalanche fund settlement is detected or entered.
- Show matched position economics after import: acquisition price, current mark, proceeds, estimated realized profit.
- Make the admin finalization button prefer `finalizeSaleWithMarketSnapshot`, not legacy `finalizeSale`, when the fund implementation supports V8 sale routing.
- Require or collect the sale router address and market snapshot before enabling architecture-aware finalization.
- Add a one-click export for Safe Transaction Builder covering `authorizeSale`, `recordSaleExecution`, and `recordExternalSaleProceeds`.
- Include role readiness next to each call: `GOVERNANCE_ROLE`, `MANAGER_ROLE`, or both.
- Auto-log import output into an operations artifact or downloadable run receipt.
- Add a deployment-surface check before settlement that verifies the live fund implementation exposes required selectors:
  - `confirmStableSaleProceeds(bytes32,address,uint256,bool,bytes32,bytes32)`
  - `finalizeSaleWithMarketSnapshot(bytes32,address,MarketSnapshot)`
- If a settlement function is missing, stop before moving funds and present an upgrade checklist.
- Prefer Foundry `cast --ledger --mnemonic-index 4` for live Safe execution until Hardhat Ledger signer discovery is fixed.
- After a Safe approval is superseded by a transfer-based settlement path, include an automatic allowance cleanup step.
- Add an admin warning when test execution hangs or artifacts are stale, because `hardhat compile` can report `Nothing to compile` while the live implementation lacks the selector expected by the workflow.
- Add an LP-support execution step after architecture-aware sale finalization:
  - show accrued LP support available,
  - split by venue and asset leg,
  - release settlement token for execution,
  - quote and execute swaps,
  - add LFJ liquidity with LP recipient set to the dead address,
  - mint Pharaoh CL position to the configured custody owner,
  - record `executeLpSupport(...)` only after each venue execution succeeds,
  - re-pause LP support and clear allowances.
- Add RPC fallback for Avalanche reads and simulations; the official RPC timed out and returned null responses during otherwise successful Safe broadcasts.

## Current Status

- Sale tx imported successfully with fallback Polygon RPC.
- Position matched and finalized as sold.
- Proceeds bridged from Polygon USDC to Avalanche USDC and settled in the fund.
- Architecture-aware finalization completed through `finalizeSaleWithMarketSnapshot`.
- V8 fund implementation upgraded first to add the missing stable settlement entrypoint, then upgraded again to add the LP-support token release entrypoint.
- Sale-profit router deployed and recorded in `contracts/deployments.json`.
- Old evidence-side Safe JSON removed because it assumed zero bridge fees.
- New execution scripts added:
  - `contracts/scripts/executeFirstSaleBridgePolygon.js`
  - `contracts/scripts/executeFirstSaleAvalancheSettlement.js`
  - `contracts/scripts/deploySaleProfitRouter.js`
- Polygon proceeds transferred from hot wallet to Polygon Safe, then bridged to Avalanche.
- Final verification passed:
  - sale status `Finalized`
  - position status `Sold`
  - fund USDC `1,895.249872`
  - Safe USDC `0`
  - Safe USDC allowance to fund `0`
  - holder distribution accrued `0`
  - LP support accrued `0`
  - buyback/burn accrued `0`
  - LP support paused `true`
  - all temporary Joe and Pharaoh allowances cleared
