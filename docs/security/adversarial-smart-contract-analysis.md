# Adversarial Smart Contract Analysis

Date: 2026-04-24

Status: historical pre-remediation review. The high-priority findings below were used to drive the `GemMintStrategyFundV5`/`GemMintStrategyFundV6` and `Gm10PortfolioRegistryV2` mainnet upgrade.

Scope: local contracts under `contracts/contracts`, with emphasis on the then-current V3/V4 fund flow, portfolio registry, investor accounting, bridge adapter, OFT adapter, and governance/timelock contracts. The analysis included the local waterfall accounting changes that were later deployed through the V6 upgrade.

## Remediation Summary

- F1 was remediated by blocking rescue of the adapted canonical CATCH token while retaining rescue for unrelated ERC-20s.
- F2 was remediated by replacing the normal release-first purchase path with authorization-bound funding confirmation and by removing arbitrary bridge execution from the normal admin workflow.
- F3 was remediated by making settled sale proceeds fund-confirmed before registry accounting and by keeping arbitrary external-token proceeds as pending metadata until normalized.
- F4 was remediated with stale-round and invalid-price checks plus a configurable staleness cap.
- F5 remains a legacy-path constraint: unsafe legacy buyback paths should stay retired or guarded wherever old deployments are referenced.
- F6 was remediated by disabling initializers on the timelock implementation.

## Assumptions

- The fund proxy is intended to custody AVAX and some ERC-20 balances, while offchain or cross-chain marketplace execution is coordinated through manager/operator roles.
- `MANAGER_ROLE`, `OPERATOR_ROLE`, adapter owner, and OFT adapter owner are privileged but still realistic compromise targets.
- Public holder dashboards and admin surfaces rely on `stableAccounting()` and registry state as integrity-critical accounting.
- Cross-chain receipt, marketplace custody, and sale settlement are not fully verifiable onchain yet.

## High-Priority Findings

### F1 - Critical: OFT owner can rescue the canonical token backing remote CATCH

`CatchOFTAdapter.rescueLockedToken()` allows the owner to transfer any ERC-20 from the adapter, including the adapted CATCH token itself (`contracts/contracts/CatchOFTAdapter.sol:22`). In the OFT adapter pattern, the canonical token balance held by the adapter is backing for remote-chain representations. If the owner key or owner multisig is compromised, or if this function is called accidentally with the canonical token, bridged CATCH can become unbacked.

Impact: loss of bridge solvency and trust in remote CATCH supply.

Recommendation: disallow rescuing the adapted token. Store the canonical token address in an immutable/local variable if the inherited adapter does not expose it safely, and add a regression that attempts to rescue CATCH and expects a revert. Keep rescue only for unrelated tokens mistakenly sent to the adapter.

### F2 - High: V4 bridging is not bound to registry purchase approvals, destinations, or accounting

`GemMintStrategyFundV4.swapAndBridge()` accepts arbitrary `purchaseKey`, `tokenIn`, `tokenOut`, `amountOut`, `dstEid`, and `dstSafe` from any `OPERATOR_ROLE` account (`contracts/contracts/GemMintStrategyFundV4.sol:85`). It only checks adapter approval and one-time use of the supplied key (`lines 96-113`). It does not read `Gm10PortfolioRegistry` to confirm that the purchase is authorized, funds are released, the destination safe matches the configured chain safe, or the amount is within the released budget. For ERC-20 paths, the bridge adapter then pulls `amount` of `token` from the fund (`contracts/contracts/StargateBridgeAdapter.sol:104`).

Impact: a compromised or overbroad operator can bridge fund-held ERC-20 balances to an arbitrary recipient on an approved adapter/pool, and accounting can diverge from actual asset movement.

Recommendation: bind `swapAndBridge()` to registry state. Require the purchase authorization to be in the right state, require `dstEid` and `dstSafe` to match the stored destination, require the amount to be less than or equal to the released budget, and mark the bridge against that authorization. Update stable accounting in the same transaction or expose a separate auditable state transition that cannot be bypassed.

### F3 - High: Sale proceeds can be confirmed by role assertion without balance settlement

`recordSaleExecution()` and `confirmSaleProceedsReceived()` accept manager-provided gross/net proceeds and only check arithmetic and equality against the previously recorded net value (`contracts/contracts/Gm10PortfolioRegistry.sol:236`, `contracts/contracts/Gm10PortfolioRegistry.sol:264`). `GemMintStrategyFundV3.finalizeSale()` then increases liquid treasury, holder claim, and LP accrual accounting based on that registry value (`contracts/contracts/GemMintStrategyFundV3.sol:245-278`). There is no onchain balance delta, escrow receipt, token transfer, or cryptographic settlement verification tied to the accounting increase.

Impact: a compromised manager can inflate NAV and holder/LP buckets with sale proceeds that were not actually received.

Recommendation: separate expected sale accounting from settled sale accounting. Finalization should require an onchain balance delta, escrow deposit, verified bridge receipt, or governance/timelock confirmation with explicit settlement proof. At minimum, emit and display the state as unverified until a distinct settlement verifier confirms funds.

## Medium-Priority Findings

### F4 - Medium: AVAX/USD feed reads do not check freshness or decimal bounds

`_quoteAvaxToUsdt()` uses `latestRoundData()` and only checks that the answer is positive (`contracts/contracts/GemMintStrategyFundV3.sol:381-387`). It ignores `updatedAt`, `answeredInRound`, and practical decimal bounds. A stale or misconfigured feed affects investment cost basis, stable NAV, redemption accounting, and treasury accounting.

Recommendation: require `updatedAt` to be recent, reject incomplete rounds where applicable, and constrain decimals to an expected range. Add tests for stale, zero, negative, and unusual-decimal feeds.

### F5 - Medium: Legacy V1 buyback path uses zero slippage protection

The legacy `GemMintStrategyFundV1` DEX flow accepts any output for USDC-to-AVAX swaps, AVAX-to-CATCH buys, and LP adds (`contracts/contracts/GemMintStrategyFundV1.sol:547-575`, `contracts/contracts/GemMintStrategyFundV1.sol:584-588`). If a V1/V2 deployment still exposes this path, it is sandwichable and can route sale proceeds into poor execution.

Recommendation: if V1/V2 remains live anywhere, disable or retire this function. Otherwise require min-out parameters, TWAP/oracle bounds, deadline controls supplied by governance, and tests for adverse price execution.

## Low-Priority Findings

### F6 - Low: Timelock implementation does not disable initializers

`GemMintTimelock` is deployed behind an ERC1967 proxy in tests, but the implementation contract itself does not disable initializers (`contracts/contracts/GemMintTimelock.sol:7-10`). This normally does not compromise the proxy, but it lets anyone initialize the implementation and can create operational confusion around ownership, roles, and implementation upgrades.

Recommendation: add a constructor that calls `_disableInitializers()`, matching the governor implementation pattern.

## Suggested Next Steps

1. Fix F1 before any OFT adapter deployment with meaningful CATCH backing.
2. Fix F2 before granting `OPERATOR_ROLE` or approving bridge adapters on production funds.
3. Decide whether sale settlement is intentionally trust-based. If yes, label it in UI/docs as manager-attested; if no, implement an onchain settlement verifier before enabling claim flows.
4. Add adversarial tests for bridge authorization, fake sale settlement, stale feed rejection, and OFT canonical-token rescue.
