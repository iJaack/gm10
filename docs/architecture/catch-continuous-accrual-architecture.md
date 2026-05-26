# $CATCH Continuous Accrual Architecture

This document describes the target $CATCH tokenomics architecture after moving away from fixed fundraising rounds, routine holder-profit distributions, and APR/APY framing.

The design goal is simple:

```text
All realized value should accrue to $CATCH, but not all value should accrue through the same route.
```

$CATCH should behave like an onchain strategy token around a collectible treasury. The system should grow treasury backing when the market wants more exposure, strengthen liquidity when market depth is thin, and remove supply when the market trades below treasury value. It should not promise yield, routine cash distributions, or instant redemption against illiquid cards.

## Core Model

$CATCH has three value-accrual routes:

1. Inventory compounding
   - Realized sale profits buy more cards and preserve liquid buying power.
   - Effect: treasury NAV per CATCH can increase through better or larger inventory.

2. Market-depth support
   - Realized sale profits build locked or protocol-owned CATCH/AVAX liquidity.
   - Effect: holders get deeper entry and exit liquidity.
   - Policy: LP is not counted in NAV.

3. Buyback and burn
   - Realized sale profits buy CATCH from the market and burn it.
   - Effect: supply contracts when CATCH trades below NAV, increasing NAV per remaining token if the buyback executes below NAV.

There is no routine holder-profit bucket in the target design. Holder value accrues through NAV growth, improved market depth, and supply reduction.

## Accounting Ledgers

The protocol should keep NAV accounting and market-support accounting separate.

NAV assets:

```text
collectible inventory value
+ liquid treasury
+ outstanding purchase releases
+ settled receivables or approved settlement assets
- liabilities
```

Market-support assets:

```text
protocol-owned LP
+ locked LP
+ LP replenishment accruals
+ buyback-and-burn accruals before execution
```

Policy:

- NAV excludes protocol-owned LP.
- NAV excludes LP replenishment accruals.
- NAV excludes unexecuted buyback-and-burn accruals once they are earmarked for market support.
- NAV includes liquid treasury before it is earmarked.
- NAV uses settled sale proceeds only after settlement proof exists.

This avoids reflexive accounting. CATCH market price should not raise NAV just because the protocol owns CATCH-side LP or has not yet burned tokens.

## Market States

The system evaluates market state from live or snapshotted values:

```text
nav_per_catch = nav_assets / total_supply
spot_premium = (spot_price - nav_per_catch) / nav_per_catch
lp_coverage = total_catch_lp_tvl / nav_assets
protocol_lp_coverage = protocol_owned_lp_tvl / nav_assets
liquid_treasury_ratio = liquid_treasury / nav_assets
slippage_depth = executable CATCH depth inside 2%, 5%, and 10% price impact
```

LP coverage is a diagnostic, not the master routing signal. It can be distorted by temporary liquidity, falling spot price, or thin pools. Sale-profit routing should follow market state first, liquidity health second, and treasury liquidity third.

The protocol should reason in four market states.

### 1. Premium Expansion

Condition:

```text
spot_price > nav_per_catch + mint_threshold
```

Behavior:

- Continuous NAV mint is open.
- Users can commit AVAX or approved settlement assets to mint new CATCH.
- Mint price is NAV plus a signed spread. The initial spread is negative to make new commits economically attractive.
- New proceeds enter the strategy treasury and follow the round-proceeds routing policy.
- Supply expands only because buyers are willing to add fresh settlement value to the strategy.

Purpose:

```text
When the market wants more CATCH exposure, the protocol sells new CATCH at a discount to NAV to incentivize primary commits and add fresh buying power.
```

Recommended parameters:

```text
mint_threshold: 3% premium to NAV
mint_spread: -5% to NAV
per-wallet cap: enabled
daily/global mint cap: enabled
NAV staleness guard: required
pause control: required
```

### 2. Par Mode

Condition:

```text
spot_price is inside the neutral band around NAV
```

Behavior:

- Continuous mint is closed or unattractive.
- No user redemption exists.
- Sale profits route by market state, liquidity health, and treasury liquidity.
- The system compounds inventory while maintaining enough market depth.

Purpose:

```text
When CATCH trades near NAV, the protocol should operate normally: buy well, sell well, recycle profits.
```

### 3. Discount Contraction

Condition:

```text
spot_price < nav_per_catch - burn_threshold
```

Behavior:

- No user redemption opens.
- The protocol does not give holders AVAX for burned CATCH.
- Instead, settled card-sale profits route more heavily to buyback-and-burn.
- Buyback execution happens from market venues with slippage limits, TWAP/oracle guards, and proof references.
- Bought CATCH is burned.

Purpose:

```text
When CATCH is cheaper than treasury NAV, the protocol can buy and destroy its own supply at an accretive price.
```

This is safer than direct redemption because it cannot drain liquid treasury on demand. It only activates from realized proceeds after cards sell.

Recommended parameters:

```text
burn_threshold: 5% discount to NAV
max buyback slippage: governance-set per execution
max buyback per sale: controlled by market-state route
execution proof: required
burn proof: required
```

### 4. Liquidity Stress

Condition:

Liquidity health is weak: permanent liquidity, slippage depth, or treasury liquidity is below target.

Behavior:

- LP support takes priority over pure reinvestment and buyback-and-burn.
- Buybacks can still happen, but not at the expense of leaving the market too thin.
- LP support remains excluded from NAV and tracked as market depth.

Purpose:

```text
If the market is too thin, buybacks are less useful and easier to distort. The first job is to make CATCH tradable.
```

## Continuous NAV Mint

The continuous mint replaces the idea of an always-open fundraising round.

It should be presented as a primary-market mint, not as a yield product or a redemption promise.

The user-facing version should be a universal commit rail:

```text
user token on source chain -> provider route -> AVAX on Avalanche -> NAV mint -> CATCH delivered back to source chain
```

The canonical fund and NAV accounting remain on Avalanche. Other chains are entry and custody surfaces, not independent accounting domains.

Flow:

1. Protocol publishes current NAV.
2. Frontend compares CATCH spot to NAV.
3. If spot trades above the premium threshold, the mint panel becomes active.
4. User selects any provider-supported source chain and token.
5. The quote layer routes the source token into AVAX on Avalanche.
6. The Avalanche commit router mints CATCH at `nav_per_catch * (1 + mint_spread_bps / 10_000)`.
7. The minted CATCH is delivered to the user's source chain through the LayerZero OFT path.
8. Proceeds enter treasury accounting.
9. New supply is included in future NAV calculations.

Mint pricing:

```text
mint_price = nav_per_catch * (1 + mint_spread_bps / 10_000)
minted_catch = contribution_value / mint_price
```

Required guards:

- NAV must be fresh.
- Spot source must be fresh.
- Mint cap must not be exceeded.
- Source token must be supported by the selected quote provider.
- Avalanche settlement asset must be approved by the commit router.
- Source route must be executable through an approved quote provider.
- Destination chain must have an enabled CATCH OFT peer before remote delivery is offered.
- Minting can be paused.
- Segment allocations mint per successful commit, because there is no terminal round-finalization event.

Continuous mint proceeds should use a treasury-first allocation, not the existing round bootstrap allocation:

```text
90% strategy treasury
10% LP support
0% team
```

Reason: continuous mint is not a bootstrap round. It is NAV expansion.

### Per-Commit CATCH Allocation

The infinite round has no finalization point, so CATCH allocation must happen at the moment each commit settles.

For every successful continuous commit:

```text
buyer_catch = contribution_value / mint_price
segment_catch_each = buyer_catch * 1%
```

Mint outputs:

```text
buyer wallet: buyer_catch
core team: buyer_catch * 1%
governance treasury: buyer_catch * 1%
community and ecosystem: buyer_catch * 1%
advisors: buyer_catch * 1%
strategic partnerships: buyer_catch * 1%
```

The effective per-commit supply expansion is:

```text
total_minted = buyer_catch * 105%
buyer share of new mint = 95.238095%
segment share of new mint = 4.761905%
```

Segment recipients remain excluded from profit-share and distribution logic. In the target design there is no routine holder-profit distribution, but the exclusion still matters for any legacy compatibility surface, future exceptional distribution, or governance reporting.

If CATCH is delivered to a remote chain through OFT, the buyer portion should be bridged to the user. Segment allocations should remain minted on Avalanche to the configured segment recipients unless governance explicitly configures remote segment recipients.

## Universal Commit Rail

The universal commit rail lets a user commit from the chain and token they already hold, while keeping GM10 accounting canonical on Avalanche.

Supported user promise:

```text
Commit any token from a supported route provider chain. GM10 converts the contribution into Avalanche value, mints CATCH on Avalanche, and delivers CATCH back to the user's chain when that chain has an enabled CATCH OFT peer.
```

Provider layer:

- LI.FI should be the first executable route provider because the admin already uses LI.FI quote and status infrastructure.
- Mobula can be added as a provider adapter for supported token and chain discovery, pricing, or routing where it is stronger.
- The frontend must not maintain a hardcoded "all chains" list. It should ask provider adapters for live supported chains, tokens, route availability, estimated output, fees, and execution status.
- A route is eligible only when it can deliver the required minimum AVAX or approved settlement asset to the Avalanche commit receiver.

Canonical flow:

1. User connects on a source chain.
2. Frontend detects source chain, wallet address, and selected token.
3. Quote provider returns an executable route into the Avalanche commit receiver.
4. Quote response includes source amount, destination amount, minimum destination amount, fees, bridge/tool name, route duration, and transaction request.
5. User signs the source-chain transaction.
6. Frontend tracks bridge/swap status through the provider status API.
7. Avalanche commit receiver observes or receives the bridged value.
8. Commit receiver mints canonical Avalanche CATCH through the NAV mint function.
9. Canonical CATCH is sent through the `CatchOFTAdapter`.
10. LayerZero delivers remote CATCH to the user's address on the source chain.

Fallbacks:

- If the source chain has no enabled CATCH OFT peer, the UI should either hide that chain or offer Avalanche CATCH delivery only.
- If the route completes on Avalanche but remote OFT delivery fails or is delayed, the user should retain a claimable canonical Avalanche CATCH balance or a retryable OFT delivery record.
- If the quote expires before signing, the transaction must be blocked and re-quoted.
- If the route lands below the minimum mintable amount, the contribution should remain pending until an operator or retry path resolves it; it must not mint at a stale or worse price.

The CATCH OFT path uses the adapter model already prepared for the canonical CATCH proxy:

```text
Avalanche CATCH remains canonical.
Remote CATCH represents bridged canonical supply.
The OFT adapter cannot rescue the adapted canonical CATCH token.
```

This preserves one source of truth for NAV, supply, and treasury accounting while still giving users a same-chain ownership experience.

## Sale-Profit Routing

Sale-profit routing is the core recycling mechanism.

At sale finalization:

```text
realized_profit = max(net_sale_proceeds - cost_basis, 0)
```

Principal returns to liquid treasury first:

```text
principal_return = min(net_sale_proceeds, cost_basis)
```

Then realized profit routes dynamically.

Inputs:

```text
spot_premium_bps
spot_discount_bps
lp_coverage_bps
protocol_lp_coverage_bps
slippage_depth_score
liquid_treasury_ratio_bps
sale_roi_bps
nav_assets_excluding_market_support
```

Outputs:

```text
reinvest_bps
lp_support_bps
buyback_burn_bps
```

The output must always sum to 10,000 bps.

## Routing Policy

The first implementation should use deterministic state bands, not a smooth formula. Bands are easier to audit, test, and explain publicly.

### Step 1: Determine Market State

Start from NAV premium or discount:

| Market state | Base route |
| --- | --- |
| Premium above mint threshold | `85% reinvest / 15% LP / 0% burn` |
| Neutral band | `75% reinvest / 25% LP / 0% burn` |
| `5-15%` discount | `65% reinvest / 25% LP / 10% burn` |
| `15-30%` discount | `55% reinvest / 25% LP / 20% burn` |
| `> 30%` discount | `45% reinvest / 25% LP / 30% burn` |

### Step 2: Liquidity Health Adjustment

Liquidity health uses three diagnostics:

```text
permanent liquidity: protocol_owned_lp_tvl / nav_assets
slippage depth: executable buy/sell depth inside 5% price impact
total depth: total_catch_lp_tvl / nav_assets
```

If liquidity health is weak, shift `10%` from reinvestment to LP support.

Example:

```text
Base route: 55% reinvest / 25% LP / 20% burn
Liquidity health: weak
Final route: 45% reinvest / 35% LP / 20% burn
```

### Step 3: Treasury Liquidity Adjustment

Treasury liquidity is the strategy's dry powder outside card marks and outside market-support budgets:

```text
liquid_treasury_ratio = liquid_treasury / nav_assets
```

If treasury liquidity is below target, shift `10%` from buyback-and-burn first, then LP support if burn is already zero, into reinvestment/liquid treasury.

Example:

```text
Base route after liquidity adjustment: 45% reinvest / 35% LP / 20% burn
Treasury liquidity: weak
Final route: 55% reinvest / 35% LP / 10% burn
```

### Final Bounds

After all adjustments:

```text
reinvest_bps: 40-90%
lp_support_bps: 10-40%
buyback_burn_bps: 0-30%
holder_distribution_bps: 0%
```

## Buyback-And-Burn Execution

Buyback-and-burn should not be automatic inside sale finalization. Sale finalization should accrue a buyback budget. Execution should be a separate operation with market checks.

Flow:

1. Sale finalization allocates realized profit to `buybackBurnAccruedUsdt6`.
2. Operator requests a buyback execution with venue, route, min output, deadline, spot reference, and proof hash.
3. Contract swaps the approved budget into CATCH, or records a Safe-executed buyback with proof.
4. Bought CATCH is burned.
5. Contract reduces `buybackBurnAccruedUsdt6`.
6. Contract emits buyback and burn events.
7. NAV sync runs after burn so NAV per remaining CATCH reflects lower supply.

Important invariant:

```text
Burning CATCH below NAV should be accretive to remaining holders.
```

Execution must reject:

- stale NAV
- stale price source
- excessive slippage
- missing proof references
- buyback amount above accrued budget
- buybacks when CATCH trades above the allowed discount band, unless governance explicitly overrides

## LP Support Execution

LP support remains a market-depth tool, not NAV backing.

LP budget splits into:

```text
50% CATCH buy leg
50% AVAX pairing leg
```

Execution:

1. Use the CATCH buy leg to market-buy CATCH.
2. Use or retain AVAX for the pairing leg.
3. Add liquidity to LFJ and/or Pharaoh.
4. Lock, burn, or assign LP ownership to the configured permanent owner.
5. Emit proof events and update protocol LP counters.

Policy:

- LP support does not count in NAV.
- LP support does count in liquidity health diagnostics.
- LP support is shown as market depth on the frontend.

## NAV Sync Rules

NAV sync should use:

```text
nav_assets =
  liquidTreasury
+ outstandingPurchaseReleases
+ canonicalPortfolioValue
- liabilities
```

Excluded from NAV:

```text
liquidityCatchBuyAccrued
liquidityAvaxPairingAccrued
buybackBurnAccrued
holderDistributionAccrued
protocol-owned LP value
```

Rationale:

- LP is market infrastructure, not card-treasury backing.
- Buyback reserves are committed to supply reduction, not holder redemption.
- Holder distribution is not part of the target model.
- NAV should remain conservative and legible.

## Frontend Architecture

The frontend should explain the system around four panels.

### 1. NAV And Market Price

Show:

```text
CATCH spot price
NAV per CATCH
premium / discount to NAV
NAV freshness
spot source
```

Language:

```text
NAV is treasury backing. LP is tracked separately as market depth.
```

### 2. Primary Mint

Show only when premium threshold is met:

```text
Mint CATCH near NAV when the market trades above treasury value.
```

States:

- Closed: spot is not above threshold.
- Open: premium threshold met.
- Paused: governance/operator pause.
- Stale: NAV or spot is stale.
- Capped: daily or global mint cap reached.
- Route unavailable: no approved provider route from the selected token/chain.
- OFT unavailable: selected chain cannot receive remote CATCH yet.

Inputs:

```text
source chain
source token
source amount
destination chain for CATCH delivery
minimum CATCH received
route provider
```

Do not show:

- APY
- APR
- guaranteed returns
- redemption language

### 3. Dynamic Profit Routing

Show:

```text
Current premium or discount
Liquidity health
Treasury liquidity
Active market state
Next-sale estimated route
```

Example display:

```text
Market: 18% discount to NAV
Liquidity health: weak
Treasury liquidity: healthy
Next sale route: 45% reinvest / 35% LP / 20% buyback burn
```

### 4. Market Support

Show market-support assets outside NAV:

```text
LFJ liquidity
Pharaoh liquidity
Protocol-owned or locked LP
Buyback burn budget
LP support budget
CATCH burned through buybacks
```

The frontend should remove holder-profit/APR/APY as primary concepts.

## Admin Architecture

Admin surfaces need explicit operator controls.

Sale finalization:

- Record gross proceeds, fees, and net proceeds.
- Confirm proceeds settlement.
- Submit sale-finalization snapshot:
  - NAV excluding market support
  - LP TVL
  - spot price
  - proof hash
  - source reference
- Preview routing before submission.
- Finalize sale and emit route event.

Universal commit operations:

- Configure approved quote providers.
- Configure enabled source chains and tokens through provider capability reads, not static assumptions.
- Configure enabled CATCH OFT destination peers.
- Monitor source-chain route status, Avalanche receipt status, NAV mint status, and OFT delivery status.
- Expose retry controls for completed Avalanche mints whose OFT delivery is pending or failed.

Buyback execution:

- Show accrued buyback budget.
- Show current discount to NAV.
- Let operator configure route, min output, and deadline.
- Require proof references.
- Show expected accretion:

```text
estimated supply burned
estimated NAV per CATCH after burn
```

LP execution:

- Show accrued LP budget.
- Show CATCH buy leg and AVAX pairing leg.
- Support LFJ and Pharaoh route selection.
- Require slippage and deadline inputs.
- Record LP proof references.

## Contract Architecture

Target upgrade modules:

1. Dynamic waterfall fund upgrade
   - Adds dynamic sale-profit allocation.
   - Adds buyback burn accrual.
   - Excludes LP and buyback reserves from NAV.
   - Requires sale-finalization snapshots.

2. Continuous mint module
   - Adds NAV-priced primary mint.
   - Enforces premium threshold, mint spread, caps, and freshness.
   - Routes new capital into treasury and optional LP support.
   - Accepts commits only through canonical Avalanche settlement.

3. Market support executor
   - Executes or records buyback-and-burn.
   - Executes or records LP support.
   - Tracks proof references and emitted events.

4. Cross-chain commit router
   - Receives bridged value on Avalanche.
   - Calls the continuous mint module.
   - Sends minted CATCH through the LayerZero OFT adapter when remote delivery is enabled.
   - Stores retryable delivery records for failed or delayed OFT sends.

The first implementation can keep modules inside one upgrade contract if storage layout is simpler, but interfaces should remain separate:

```text
previewContinuousMint(...)
mintAtNav(...)
commitFromProviderRoute(...)
deliverMintedCatchOft(...)
previewSaleProfitRoute(...)
finalizeSaleWithMarketSnapshot(...)
previewBuybackBurn(...)
executeBuybackBurn(...)
executeLpSupport(...)
```

## Safety Invariants

The system must preserve these invariants:

1. No unverified proceeds enter accounting.
2. NAV excludes protocol-owned LP.
3. NAV excludes LP support accruals.
4. NAV excludes buyback-burn accruals once earmarked.
5. User redemption is not available by default.
6. Minting only happens at the configured NAV-derived signed spread.
7. Buyback-and-burn only uses accrued sale-profit budget.
8. Buyback-and-burn cannot exceed budget.
9. Buyback execution must be slippage-bounded.
10. LP support remains separately visible from NAV.
11. Emergency pause can stop mint, buyback, and LP execution.
12. Stale NAV or stale market data blocks price-sensitive actions.
13. Cross-chain commits settle on Avalanche before CATCH is minted.
14. Remote CATCH delivery is offered only for chains with configured OFT peers.
15. Provider quotes must include minimum received amounts and expiry checks.
16. A failed OFT delivery must not lose canonical CATCH; it must be claimable or retryable.

## Public Narrative

Short version:

```text
$CATCH tracks a collectible strategy. When the market wants more exposure, users can commit from supported chains and tokens, the route settles on Avalanche, new CATCH is minted at the configured NAV discount, and LayerZero delivers CATCH back to the user's chain when supported. When cards sell profitably, proceeds are recycled into new inventory, locked liquidity, or CATCH buyback-and-burn depending on market conditions. NAV excludes LP, so treasury backing stays conservative and easy to inspect.
```

What not to say:

```text
CATCH pays APY.
CATCH pays APR.
Holders receive guaranteed profit distributions.
Holders can always redeem CATCH for AVAX.
Protocol-owned LP backs NAV.
Every chain can receive CATCH before an OFT peer is configured.
```

What to say:

```text
CATCH accrues value through treasury growth, market depth, and supply reduction.
Avalanche remains the canonical accounting chain; other chains are contribution and ownership surfaces.
```

## Example States

### Premium And Healthy Liquidity

```text
spot premium: +12%
liquidity health: healthy
treasury liquidity: healthy
continuous mint: open
sale route: 85% reinvest / 15% LP / 0% burn
```

Interpretation:

The market is willing to pay above NAV and liquidity is healthy. The protocol should expand supply through primary mint and recycle sale profits mostly into more inventory.

### Near NAV And Thin Liquidity

```text
spot premium: +1%
liquidity health: weak
treasury liquidity: healthy
continuous mint: closed
sale route: 65% reinvest / 35% LP / 0% burn
```

Interpretation:

The market is near fair value but liquidity needs work. Sale profits should still compound inventory, but LP support remains meaningful.

### Discount And Healthy Liquidity

```text
spot discount: -18%
liquidity health: healthy
treasury liquidity: healthy
continuous mint: closed
sale route: 55% reinvest / 25% LP / 20% burn
```

Interpretation:

The market is selling CATCH below treasury NAV. The protocol should use part of realized sale profits to buy and burn discounted CATCH.

### Discount And Thin Liquidity

```text
spot discount: -18%
liquidity health: weak
treasury liquidity: healthy
continuous mint: closed
sale route: 45% reinvest / 35% LP / 20% burn
```

Interpretation:

The market is discounted and thin. The protocol should still buy and burn some CATCH, but LP support remains the largest market-support priority.

## Implementation Order

1. Update public copy and architecture docs so the system no longer describes routine holder-profit APR/APY.
2. Add pure TypeScript policy functions and frontend projections.
3. Add the contract upgrade with dynamic sale-profit routing and NAV exclusion rules.
4. Add admin sale-finalization snapshot and route preview.
5. Add continuous NAV mint with premium threshold and caps.
6. Add the universal commit rail with LI.FI first, provider abstraction for Mobula, and LayerZero OFT delivery.
7. Add buyback-and-burn execution.
8. Add LP support execution improvements.
9. Deploy only after storage validation, contract tests, frontend tests, admin tests, and browser smoke checks pass.

## Initial Parameters

The first implementation should use these defaults. Governance can change them later through the normal parameter-update path.

```text
mint_threshold_bps
mint_spread_bps
burn_threshold_bps
neutral_band_bps
daily_mint_cap_bps
per_wallet_mint_cap_bps
max_buyback_slippage_bps
max_lp_slippage_bps
nav_staleness_seconds
spot_staleness_seconds
route_quote_ttl_seconds
min_route_output_buffer_bps
```

Initial defaults:

```text
mint_threshold_bps = 300
mint_spread_bps = -500
burn_threshold_bps = 500
neutral_band_bps = 300
daily_mint_cap_bps = 500       # max 5% of current supply per day
per_wallet_mint_cap_bps = 100  # max 1% of current supply per wallet per day
max_buyback_slippage_bps = 150
max_lp_slippage_bps = 150
nav_staleness_seconds = 7 days
spot_staleness_seconds = 30 minutes
route_quote_ttl_seconds = 10 minutes
min_route_output_buffer_bps = 50
```
