# $CATCH Is Moving To Continuous Accrual

GM10 is preparing a new $CATCH architecture built around continuous commits, conservative NAV, and direct value accrual instead of fixed fundraising rounds or APY-style claims.

The core change is simple: the round becomes infinite. Users should not wait for an end-of-round event to receive $CATCH allocation. Each successful commit settles on Avalanche, mints buyer $CATCH for that commit, and mints the five configured 1% segment allocations at the same time. The allocation unit is the commit, not the round.

## What Changes

Continuous commits replace fixed round close mechanics. A user can commit from any LI.FI or Mobula-supported chain and token. The route bridges or swaps into the Avalanche commit receiver, the system verifies settlement, and $CATCH is minted against the settled value. If the user started from another supported chain, LayerZero OFT delivery can return their $CATCH there, with an Avalanche claim fallback if delivery cannot complete.

Realized card sale profit no longer creates a routine holder-claim or APR/APY surface. Sale proceeds restore principal first. Profit then routes dynamically based on the current market snapshot:

- buying power for more inventory and liquid execution capacity
- bounded LP support
- conditional $CATCH buyback-and-burn reserve when the token trades at a discount

Protocol-owned LP is not counted in NAV. That keeps NAV conservative: cards, cash, and pending purchase accounting can back the reference value, while liquidity support remains a market-structure tool rather than an accounting boost.

## Why It Matters For $CATCH

$CATCH value accrual becomes cleaner. New demand creates $CATCH immediately when a commit settles. Profitable sales recycle value into more cards, deeper markets, or lower supply through buyback-and-burn. The system avoids advertising yield that depends on compounding assumptions, claim timing, or future sale cadence.

The token impact is:

- commits expand supply only when settlement actually arrives
- segment allocations mint per commit, so there is no hidden end-of-round batch
- reinvestment keeps the card strategy compounding operationally
- buyback-and-burn gives discounts a direct supply-reduction response
- LP support can improve execution without inflating conservative NAV

The intended result is a $CATCH model that is easier to reason about: one token tracks the collectible strategy, fresh commits enter through a continuous rail, and realized profits accrue back to the token system without pretending to be fixed yield.

## What Ships With This Upgrade

The V8 contract surface disables redemptions, adds continuous mint settlement, routes sale profits through a snapshot-aware router, tracks buyback-burn and LP support reserves, and keeps market-support assets out of NAV.

The admin and public apps are being updated to match that language. Holder pages now focus on NAV, supply, buying power, and market support rather than APR, APY, or routine claimable profit. The fundraising surface introduces the continuous commit rail and the cross-chain flow users should expect next.

The design goal is direct: all value should accrue to $CATCH in one way or another, without using a yield label that overpromises what a collectible strategy can guarantee.
