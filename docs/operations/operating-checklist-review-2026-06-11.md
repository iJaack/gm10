# GM10 Operating Checklist Review - 2026-06-11

This review hardens the first-pass GM10 operations checklist from the current sale logs, admin workflow, and onchain workflow shape. It is a checklist review, not a policy source: founder-gated decisions are called out separately and should not be encoded as default operator behavior until approved.

## Reviewed Sources

- `docs/operations/first-card-sale-2026-06-06.md`
- `docs/operations/gengar-sale-2026-06-10.md`
- `docs/marketplace-checklist.md`
- `apps/admin/src/panels/OperationsPanel.tsx`
- `contracts/contracts/Gm10PortfolioRegistry.sol`
- `contracts/contracts/GemMintStrategyFundV8.sol`
- sale and LP execution scripts under `contracts/scripts`

## Reusable Sale Operating Checklist

### 1. Preflight

- Confirm the operator is acting from the correct Safe, chain, signer, and Ledger index.
- Record Safe owner set, threshold, and starting nonce for every chain involved.
- Confirm the required registry/fund roles for each call:
  - `GOVERNANCE_ROLE` for sale authorization and cancellation.
  - `MANAGER_ROLE` for sale execution, proceeds confirmation, market-snapshot finalization, LP release, and LP execution accounting.
- Confirm the live fund implementation exposes the selectors needed for the planned path before any funds move:
  - `confirmStableSaleProceeds(bytes32,address,uint256,bool,bytes32,bytes32)`
  - `finalizeSaleWithMarketSnapshot(bytes32,address,MarketSnapshot)`
  - `releaseLpSupportToken(address,address,uint256,uint256,bytes32)` when LP support execution is expected.
- Confirm marketplace approval, chain Safe config, settlement token approval, pause states, and current outstanding sale/LP/buyback accruals.
- Snapshot starting balances for the fund, Avalanche Safe, source-chain Safe or hot wallet, and any venue custody wallet.

### 2. Sale Evidence Intake

- Start from the marketplace sale transaction, not a manually invented sale key.
- Record asset, registry position, collection, token ID, buyer, seller/custody wallet, sale tx, block, timestamp, and source-chain proceeds token.
- Reconcile gross proceeds, marketplace fees, bridge/withdrawal fees, and expected net proceeds in 6-decimal USDT terms.
- Match the sale to an active registry position and record the current acquisition price, current mark, and estimated realized profit.
- Generate the sale key deterministically and verify the current sale authorization status is `None`.
- Classify any proceeds that are not part of the sale before building a transaction batch.

### 3. Settlement

- Bridge or transfer only the approved sale proceeds amount from source-chain custody to Avalanche settlement custody.
- Record bridge provider, route, source amount, destination amount, bridge fees, source tx, destination receipt tx, and block confirmations.
- If a signing or broadcast attempt fails, record whether a transaction was submitted; verify nonce, balances, and allowances before retrying.
- Do not confirm proceeds in the fund until the Avalanche settlement amount is known and reconciled to the sale's expected net amount.

### 4. Registry and Fund Accounting

- Authorize the sale with `minNetProceedsUsdt6` set to the exact settled amount or the approved minimum for the operation.
- Record sale execution with gross proceeds, marketplace fees, bridge fees, execution ref, proceeds ref, and proof hash.
- Record external proceeds when source-chain funds existed outside Avalanche before settlement.
- Confirm stable proceeds only after the settlement token is present or pullable by the fund.
- Finalize through `finalizeSaleWithMarketSnapshot`, not legacy `finalizeSale`, for production V8 sales.
- Record the market snapshot proof, observed-at time, route output, realized profit, and resulting reinvest/LP/buyback buckets.

### 5. LP Support Execution

- Before release, record current LP support accrual, pause states, target venue set, custody mode per venue, and Safe token baselines.
- Release only the accrued amount approved for this execution.
- Quote each swap leg with explicit minimum-output guard, deadline, and route.
- Execute venue liquidity only after swaps succeed.
- Call `executeLpSupport(...)` after the external venue action succeeds, because release alone does not decrement accounting.
- Restore pause state and clear all temporary allowances.
- Verify LP accrual is decremented, venue custody is correct, residual balances are explained, and allowances are zero.

### 6. Final Receipt

Every sale run should end with one receipt containing:

- sale tx, settlement txs, registry/fund txs, LP txs, chain IDs, blocks, and timestamps;
- gross proceeds, marketplace fees, bridge fees, net proceeds, cost basis, realized profit, and route split;
- Safe nonce before/after, signer path, failed-attempt status, and retry evidence;
- final sale status, position status, fund balance, Safe balances, accrual balances, pause states, and allowances;
- explicit unresolved items with owner and next action.

## Gaps Found

- The current operation notes are strong execution logs, but there is no single reusable checklist or receipt template operators can follow before the next sale.
- The admin sale panel still exposes a legacy `finalizeSale` button and tells operators to use the V8 path manually. Production sale finalization should be gated behind the market-snapshot router path.
- Selector readiness was discovered mid-run during the first sale. It should be a preflight stop condition before settlement movement.
- Failed Ledger/broadcast attempts are recorded, but the required retry receipt is not standardized. Each failure should capture submitted/not submitted, nonce, allowance, and balance checks.
- Extra proceeds classification is not standardized. The Gengar run correctly left `52.000000` USDC in the Polygon Safe, but the checklist needs a required classification step for any excess source-chain balance.
- LP support policy is not stable enough for operators to infer. The first sale used LFJ plus Pharaoh; the Gengar run used Pharaoh only. This should remain explicit per run until founder policy is settled.
- Market snapshot inputs are recorded in the first sale but not described as a reusable evidence pack with source, freshness, bounds, and approval criteria.
- The marketplace checklist has the right six gates, but sale/post-sale operations need an additional gate for post-run cleanup: allowances, pause states, residual balances, and receipt publication.
- There is no standard rollback/unwind checklist for partial states such as authorized sale without execution, executed sale without proceeds, confirmed proceeds without finalization, or LP funds released before venue execution.

## Founder-Gated Decisions

- Default LP venue policy: LFJ plus Pharaoh, Pharaoh-only, or per-sale market-structure decision.
- Treatment of excess source-chain funds, including whether small residual balances become Safe dust, sale proceeds, card-buying power, or separate treasury funds.
- Market snapshot authority: who can approve snapshot inputs, freshness windows, and route proof standards.
- Exact operator policy for hot-wallet use when a venue cannot execute through Safe directly.
- Whether post-sale receipts should be public-facing, internal-only, or split into public summary plus internal execution appendix.
- Required approval threshold before upgrading live fund implementations during an active sale workflow.

## Recommended Next Actions

1. Convert this review into a canonical `docs/operations/sale-runbook.md` with a preflight checklist, execution checklist, receipt template, and partial-state unwind table.
2. Update the admin sale panel so production finalization uses `finalizeSaleWithMarketSnapshot` with required router and snapshot fields; move legacy finalization behind an explicit emergency/legacy label.
3. Add an admin readiness check that blocks settlement/finalization when required selectors, roles, pause states, settlement token config, or Safe chain context are missing.
4. Add an "extra proceeds classification" field to sale import/run receipts, required whenever source-chain custody balance exceeds imported sale proceeds.
5. Add a post-sale cleanup gate to the marketplace checklist: temporary allowances zeroed, pauses restored, residual balances classified, and receipt published.
6. Create a partial-state rollback table for each sale state and LP support state before the next live sale.
