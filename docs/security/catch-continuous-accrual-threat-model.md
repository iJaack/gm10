# CATCH Continuous Accrual Threat Model

Date: 2026-05-25

Status: ready to ship as the security reference for the continuous-accrual redesign. The architecture is not ready to ship to production until the blocking regressions in this document are resolved.

## Scope

This threat model covers the target CATCH architecture described in `docs/architecture/catch-continuous-accrual-architecture.md`:

- Continuous NAV minting instead of finite fundraising rounds.
- Per-commit CATCH allocation, including the 5 segment allocations, because the round is infinite.
- Cross-chain commit rail where a user commits a provider-supported token on a provider-supported source chain, the route settles value on Avalanche, canonical CATCH is minted, and CATCH is delivered back to the user's source chain when a LayerZero OFT peer exists.
- Sale-profit routing into reinvestment, LP support, and buyback-and-burn.
- No routine holder-profit distribution, APR, APY, or direct user redemption.
- NAV that excludes protocol-owned LP, LP support accruals after earmark, buyback-and-burn accruals after earmark, and holder distributions.

The model is repo-grounded against the current contracts, public frontend, admin app, and existing historical security analysis.

## System Model

### Main Flows

1. Continuous commit
   - User selects a supported source chain and token.
   - Route provider quotes a path into Avalanche AVAX or an approved Avalanche settlement asset.
   - The user executes the provider transaction from the source chain.
   - The Avalanche commit receiver recognizes actual settlement.
   - The fund mints CATCH at `NAV * (1 + mint_spread_bps / 10_000)`.
   - Buyer CATCH is delivered locally on Avalanche or sent through the CATCH OFT adapter to the user's source chain.
   - Segment recipients receive 1 percent each per successful commit, not at round finalization.

2. Sale finalization
   - Principal returns to liquid treasury first.
   - Realized profit is routed dynamically by market state, liquidity health, and liquid treasury needs.
   - Profit never creates a routine holder-claim bucket.

3. Buyback and burn
   - Sale profit can accrue into a buyback budget.
   - Execution is separate from sale finalization.
   - Execution requires fresh market data, bounded slippage, a proof hash, and budget accounting.
   - Bought CATCH is burned and NAV is synced after supply changes.

4. LP support
   - Sale profit can accrue into LP support.
   - LP support is market-support accounting and is excluded from NAV.
   - LP support can affect liquidity-health diagnostics but cannot inflate backing value.

### Trust Boundaries

| Boundary | Trusted component | Untrusted or partially trusted input |
| --- | --- | --- |
| Source chain wallet | User signature | User address format, source-chain token, source-chain transaction status |
| Route provider | Approved adapter configuration | Quote output, tool choice, expiry, status API, fee estimate, route calldata |
| Avalanche settlement | Commit receiver balance and escrow state | Provider status text, frontend route state, offchain route IDs |
| NAV mint | Fresh NAV, fresh spot, cap checks | Stale marks, stale DEX spot, manipulated thin-pool prices |
| OFT delivery | Configured LayerZero peers and adapter owner | Remote-chain availability, gas payment, peer misconfiguration, retry status |
| Sale accounting | Verified settlement asset in fund custody | Marketplace sale claim, manager-entered proceeds, bridged proceeds in flight |
| Dynamic routing | Onchain or signed market snapshot | LP coverage, slippage depth, DEX spot, treasury-liquidity labels |
| Admin/frontend | Contract state and allowlisted APIs | User-entered routes, unsupported chains, stale public copy, cached quotes |

## Security Invariants

These invariants are required for production:

1. No mint from quote alone. CATCH mints only after Avalanche settlement is verified by balance delta, escrow receipt, or an equivalent onchain settlement proof.
2. Mint price uses fresh NAV and the configured signed spread; the default is -500 bps.
3. Segment allocations are minted per successful commit and are excluded from buyer delivery math.
4. Source-chain delivery is allowed only when the destination chain has an enabled CATCH OFT peer.
5. Failed OFT delivery cannot burn user value. The user must have claimable canonical CATCH or a retryable delivery record.
6. NAV excludes protocol-owned LP and earmarked market-support budgets.
7. Realized sale profit never accrues to a routine holder-distribution bucket.
8. Direct redemption remains disabled or removed from all public flows.
9. Buyback-and-burn spends only accrued buyback budget and must enforce min output, deadline, and stale-price rejection.
10. LP support cannot be presented as asset backing or counted in NAV.
11. Route, mint, buyback, and LP operations are pauseable independently.
12. Every cross-chain commit is idempotent by commit ID or route ID.

## Threats And Required Controls

| ID | Severity | Threat | Abuse Path | Required Control |
| --- | --- | --- | --- | --- |
| T1 | Critical | Mint before real settlement | A provider status, frontend state, or operator action claims a route completed, but the Avalanche receiver did not receive assets. | Mint only from receiver balance delta or escrowed settlement state. Persist route IDs and consumed settlement amounts. Reject optimistic status-only minting. |
| T2 | Critical | NAV inflation from market-support assets | LP support, buyback accruals, or holder-distribution accruals are included in NAV. | Replace the current stable NAV formula with `liquidTreasury + outstandingPurchaseReleases + canonicalPortfolioValue + settledReceivables - liabilities`. Add tests that LP and burn accruals do not change NAV. |
| T3 | Critical | Cross-chain route replay or double mint | A completed route is retried, a webhook/status is replayed, or the same settlement balance is consumed twice. | Store commit IDs, provider route IDs, settlement token, amount, receiver, source chain, source tx hash, and consumed amount. Enforce one mint per settlement unit. |
| T4 | High | Stale or manipulated NAV mint price | Old card marks, stale AVAX feed, stale DEX spot, or thin-pool spot manipulation opens discounted minting. | Require NAV freshness, oracle freshness, DEX TWAP or median spot, min liquidity, per-commit caps, per-wallet caps, and daily mint caps. |
| T5 | High | Route provider quote manipulation | A provider returns optimistic `toAmountMin`, wrong calldata, unexpected receiver, or expired route. | Verify transaction request target, receiver, destination chain, settlement token, min output, expiry, and integrator. Bind quote hash into commit preview and execution. |
| T6 | High | Unsupported chain receives unbacked or undeliverable CATCH | Frontend offers a provider-supported route where CATCH OFT is not configured on the source chain. | Chain eligibility requires both provider route support into Avalanche and an enabled CATCH OFT peer. Otherwise show Avalanche-only claim or hide the route. |
| T7 | High | OFT adapter or peer compromise | Adapter owner or peer configuration moves backing, misroutes supply, or breaks remote backing. | Keep the canonical token rescue block. Put adapter owner and peer changes behind Safe plus timelock. Monitor remote supply versus adapter backing. |
| T8 | High | Failed OFT delivery strands user funds | Settlement succeeds and CATCH is minted, but remote delivery fails due to gas, peer outage, or LayerZero issue. | Mint to escrow first, then deliver. If delivery fails, record claimable Avalanche CATCH and allow retry with new gas. |
| T9 | High | Buyback sandwich or toxic execution | Operator executes buyback through a thin venue with poor output or no slippage bound. | Enforce min output, deadline, max slippage, fresh TWAP/spot, tranche caps, and post-trade burn verification. Keep legacy zero-slippage buyback paths retired. |
| T10 | High | Dynamic route snapshot manipulation | A privileged operator supplies premium/discount, LP coverage, or slippage-depth inputs that push profit away from the intended bucket. | Compute where possible onchain. For offchain metrics, require signed source snapshots, proof hashes, bounded routing bands, event emission, and admin UI diffing. |
| T11 | Medium | LP coverage becomes a manipulable control knob | Temporary third-party liquidity or spot movement makes LP coverage look healthy or weak. | Treat LP coverage as diagnostic only. Routing priority must remain market state first, liquidity health second, liquid treasury third. |
| T12 | Medium | Public route API abuse | Public quote endpoints become a free quote proxy or get rate-limited by providers. | Add rate limits, cache short-lived discovery responses, strict schemas, CORS allowlists, and provider-key isolation. |
| T13 | Medium | Non-EVM address or recipient confusion | Provider routes support non-EVM chains, but OFT delivery may require different recipient encoding or may not exist. | Maintain a chain capability matrix for settlement support, OFT support, recipient encoding, and refund/claim behavior. |
| T14 | Medium | Partial fill creates ambiguous mint value | A route settles below minimum output or with a different token. | Do not mint below minimum. Mark route pending, retryable, or refundable. Mint only against approved settlement assets and actual received amount. |
| T15 | Medium | User-facing copy creates yield or redemption expectation | Public pages continue to show APY, APR, holder claim, or redemption language. | Remove routine-yield and redemption copy before launch. Use NAV growth, liquidity depth, and buyback-and-burn language. |
| T16 | Medium | Role compromise | Manager, operator, governance, adapter owner, or route admin keys can redirect accounting or execution. | Role separation, Safe thresholds, timelocks for config changes, small execution caps, emergency pause, and monitoring. |
| T17 | Low | Mobula support is overclaimed | Mobula is described as a provider before adapter semantics exist. | Ship LI.FI first. Gate Mobula behind a provider adapter spec and tests before exposing it in user copy. |

## Breaking Changes

### Contract And Accounting

1. `finalizeSale` must stop using the fixed 25/40/35 split.
   - Current evidence: `contracts/contracts/GemMintStrategyFundV3.sol` still allocates 25 percent treasury profit, 40 percent holder distribution, and 35 percent LP support in `finalizeSale`.
   - Required change: principal returns to liquid treasury first; realized profit routes through the dynamic reinvest/LP/burn policy; holder distribution is zero.

2. Stable NAV must exclude market-support buckets.
   - Current evidence: `contracts/contracts/GemMintStrategyFundV3.sol` `_syncStableNav()` includes `liquidityCatchBuyAccruedUsdt6`, `liquidityAvaxPairingAccruedUsdt6`, and `holderDistributionAccruedUsdt6`.
   - Required change: NAV excludes protocol-owned LP, LP accruals after earmark, buyback-and-burn accruals after earmark, and holder-distribution accruals.

3. Segment allocation moves from round finalization to each commit.
   - Current evidence: `contracts/contracts/GemMintStrategyFundV7.sol` mints five 1 percent segment allocations inside `_finalizeRound()`.
   - Required change: continuous mint must mint buyer CATCH and segment CATCH atomically per successful commit. Total minted per commit is `buyer_catch * 105%`, with the buyer receiving `buyer_catch` and each segment receiving `buyer_catch * 1%`.

4. Direct redemption must be removed or permanently disabled.
   - Current evidence: `contracts/contracts/Gm10FundStorageV2.sol` still contains `_redeem()`, and `GemMintStrategyFundV7.sol` gates redemption by investor attribution.
   - Required change: no user redemption opens. Discount response is protocol buyback-and-burn funded by realized sale profits.

5. Continuous mint is a new ABI surface.
   - Required functions include preview, settlement recognition, mint, segment allocation, OFT delivery, retry/claim, route pause, cap config, and event indexing.

6. Cross-chain commit cannot be "any token, any chain" literally.
   - Required change: eligible routes are the intersection of provider-supported source token/chain, executable route into Avalanche, approved settlement asset, and enabled CATCH OFT peer.

### Frontend And Admin

1. Public fundraising UI must change from finite-round investing to continuous commit.
2. Public holders UI must remove holder-profit APR/APY and routine claim language.
3. Protocol diagrams and allocation constants must remove 25/40/35 holder-claim waterfall copy.
4. Admin sale finalization must show dynamic routing preview and proof inputs.
5. Admin must separate sale finalization, buyback execution, LP execution, and NAV sync.
6. Admin route tooling must graduate from purchase-funding LI.FI support to user-facing commit quotes with route eligibility, quote expiry, status, retry, and claim state.

## Bugs And Regressions Found In Current Worktree

These are blockers for production launch of the architecture.

| ID | Priority | Finding | Evidence | Required Fix |
| --- | --- | --- | --- | --- |
| B1 | P0 | Current sale accounting contradicts target routing. | `GemMintStrategyFundV3.finalizeSale()` still writes to holder distribution and fixed LP buckets. | Implement dynamic route accounting and add tests for premium, neutral, discount, liquidity-weak, and treasury-weak cases. |
| B2 | P0 | Current NAV includes buckets that the new architecture explicitly excludes. | `_syncStableNav()` includes liquidity and holder-distribution accruals. | Replace NAV calculation and add regression tests proving support buckets do not increase NAV. |
| B3 | P0 | Segment allocations are not per commit. | `GemMintStrategyFundV7._finalizeRound()` mints segment allocations after round finalization. | Move segment allocation into continuous commit minting. Remove dependency on round finalization. |
| B4 | P0 | Redemption still exists in contract surfaces. | `Gm10FundStorageV2._redeem()` burns user CATCH and pays AVAX when enabled. | Permanently disable, remove from new ABI, or guard with an unreachable state for the continuous architecture. |
| B5 | P1 | Public frontend still promises holder claims and realized-profit distributions. | `src/data/protocol.ts`, `src/pages/Catch.tsx`, `src/pages/Fundraising.tsx`, `src/components/ProtocolDiagrams.tsx`, and holders pages still reference holder claim buckets or profit claims. | Replace with continuous commit, NAV growth, LP support, and buyback-and-burn language. |
| B6 | P1 | Existing tests assert the old waterfall. | `src/App.test.tsx` expects 25 percent treasury, 40 percent holder claim, and 35 percent LP replenishment. | Rewrite tests around dynamic sale-profit routing and no holder distribution. |
| B7 | P1 | LI.FI tooling is purchase-funding oriented, not continuous commit oriented. | `apps/admin/server/lib/lifi.js` normalizes funding quotes into admin flows and uses a small source buffer. | Add user commit quote APIs with eligibility, quote hash, expiry, min settlement, status, idempotency, and OFT delivery handling. |
| B8 | P1 | LP ownership language is ambiguous. | Architecture allows "lock, burn, or assign LP ownership" without venue-specific rules. | Define the exact allowed LP custody mode per venue and disallow unsupported alternatives in admin and contracts. |
| B9 | P2 | Mobula is not implementation-ready. | Architecture names Mobula as a future adapter, but repo evidence only shows LI.FI quote infrastructure. | Keep Mobula hidden until the adapter contract, API semantics, and tests exist. |

## Required Test Plan

### Milestone 1: Continuous Commit Contracts

Atomic tasks:

1. Add settlement receiver and commit state machine.
2. Add `previewContinuousMint`.
3. Add settlement-based `mintAtNav` or equivalent.
4. Mint segment allocations per commit.
5. Add OFT delivery escrow, retry, and claim fallback.

Regression and unit tests:

- Cannot mint from provider quote alone.
- Cannot mint outside the configured NAV-derived spread.
- Cannot mint with stale NAV, stale spot, unsupported settlement token, unsupported source chain, or missing OFT peer.
- Duplicate route ID cannot mint twice.
- Partial settlement below minimum does not mint.
- Buyer receives only buyer allocation; five segment recipients receive 1 percent each.
- Failed OFT delivery leaves claimable Avalanche CATCH.

### Milestone 2: NAV And Sale-Profit Routing

Atomic tasks:

1. Replace fixed sale waterfall.
2. Add dynamic routing calculation with bounded bands.
3. Add buyback-burn accrual accounting.
4. Exclude all market-support buckets from NAV.
5. Add explicit liabilities if any legacy holder-distribution state remains.

Regression and unit tests:

- Principal returns to liquid treasury first.
- Profit routes correctly in premium, neutral, discount, liquidity-weak, and treasury-weak cases.
- Holder distribution stays zero.
- LP support accrual does not increase NAV.
- Buyback-burn accrual does not increase NAV once earmarked.
- NAV sync after burn increases NAV per remaining token only through reduced supply, not reflexive accounting.

### Milestone 3: Buyback, Burn, And LP Execution

Atomic tasks:

1. Add buyback execution with venue, route, min output, deadline, spot reference, and proof hash.
2. Add burn verification and events.
3. Add LP execution with venue-specific custody rules.
4. Add pause controls for buyback and LP execution.

Regression and unit tests:

- Buyback rejects stale price, excessive slippage, expired deadline, missing proof, over-budget execution, and above-band execution without governance override.
- Burn reduces supply and records proof.
- LP execution rejects ambiguous custody mode.
- LP support affects liquidity diagnostics but not NAV.

### Milestone 4: Frontend And Admin Migration

Atomic tasks:

1. Replace fundraising page with continuous commit.
2. Replace fixed allocation diagrams with dynamic routing views.
3. Remove APR/APY, holder claim, and routine distribution language.
4. Add route discovery, quote preview, status, retry, and claim screens.
5. Add admin sale-routing preview and execution panels.

Regression and unit tests:

- No public page contains APR/APY, routine holder-profit, holder claim bucket, or redemption copy.
- Commit UI hides chains without both provider route support and CATCH OFT support.
- Expired quote disables execution.
- Route failure shows retry or claim state.
- Admin cannot execute sale, buyback, or LP operations with stale snapshots.

## Ship Gates

The continuous architecture is production-ready only when all of these gates pass:

1. All P0 and P1 findings in this document are fixed or explicitly waived by governance with compensating controls.
2. No frontend or admin production route advertises holder APY, APR, routine holder claims, or user redemption.
3. Contract tests prove NAV excludes protocol-owned LP and market-support accruals.
4. Contract tests prove segment allocations happen per commit.
5. Cross-chain commit tests cover success, quote expiry, partial settlement, duplicate route, unsupported OFT peer, OFT failure, retry, and claim.
6. Buyback-and-burn tests cover stale price, min output, deadline, budget, proof, and burn accounting.
7. LP execution tests cover venue-specific custody and NAV exclusion.
8. Emergency pauses are available for commit, OFT delivery, buyback, LP execution, and sale finalization.
9. Mainnet configuration has explicit allowlists for providers, source chains, settlement assets, OFT peers, DEX venues, and privileged roles.
10. A public narrative review confirms the product is framed as strategy-token value accrual, not yield or redemption.

## Residual Risks

1. Collectible NAV remains mark-dependent and less liquid than onchain assets.
2. Route providers and LayerZero add external availability and execution risk.
3. Buyback-and-burn helps discounts only when realized sale profits exist.
4. LP support improves tradability but does not guarantee exit liquidity at NAV.
5. Governance and operator compromise remain high-impact even with caps and timelocks.

## Readiness Verdict

The threat model is ready to ship as the security baseline for implementation.

The architecture should not ship to users until the fixed waterfall, NAV inclusion, finalize-round segment minting, redemption surfaces, stale public copy, and continuous-commit route controls are updated and tested.
