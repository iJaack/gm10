# SKILL.md — Gem Mint Strategy ($CATCH)

AI agent integration guide for the Gem Mint Strategy platform.
Read this file to understand how to interact with the platform programmatically.

---

## What Is This

**Gem Mint Strategy** is a tokenized fund on Avalanche that provides fractional exposure to high-grade Pokémon cards (PSA/BGS 9–10).

- **$CATCH** — the fund token. Represents ownership in the card portfolio. NAV-based pricing.
- **$EVA** — the access token. Hold 10M $EVA (Avalanche mainnet) to access gated pages.
- **Chain:** Avalanche Fuji Testnet (testnet phase) → Avalanche C-Chain (mainnet launch)
- **Frontend:** [gm10.xyz](https://gm10.xyz) (or current deployment)

---

## Contracts

### Fuji Testnet (current)

| Contract | Address | Purpose |
|----------|---------|---------|
| `GemMintStrategyFund` (Proxy) | `0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C` | Core fund — invest, NAV, rounds |
| `GemMintGovernor` | `0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf` | OZ Governor — propose, vote, execute |
| `GemMintTimelock` | `0x73cBa10f55251da73423c7Ea76EC4743F5F583d3` | 24h timelock for approved proposals |

### Mainnet

| Contract | Address | Purpose |
|----------|---------|---------|
| `$EVA Token` | `0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672` | Token gate access (Avalanche C-Chain) |

### Chain IDs
- **Avalanche Fuji Testnet:** `43113` — fund operations, $CATCH
- **Avalanche C-Chain:** `43114` — $EVA balance check

---

## RPC Endpoints

```
Avalanche Mainnet: https://api.avax.network/ext/bc/C/rpc
Avalanche Fuji:    https://api.avax-test.network/ext/bc/C/rpc
```

---

## Core Fund ABI (key functions)

```json
[
  {
    "name": "invest",
    "inputs": [{ "name": "_roundId", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "name": "currentRoundId",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "name": "getRound",
    "inputs": [{ "name": "_roundId", "type": "uint256" }],
    "outputs": [{
      "type": "tuple",
      "components": [
        { "name": "roundId", "type": "uint256" },
        { "name": "targetAmount", "type": "uint256" },
        { "name": "raisedAmount", "type": "uint256" },
        { "name": "tokenPrice", "type": "uint256" },
        { "name": "minInvestment", "type": "uint256" },
        { "name": "maxInvestment", "type": "uint256" },
        { "name": "startTime", "type": "uint256" },
        { "name": "endTime", "type": "uint256" },
        { "name": "isActive", "type": "bool" },
        { "name": "isFinalized", "type": "bool" }
      ]
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "name": "navPerToken",
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
]
```

---

## Governance ABI (key functions)

```json
[
  { "name": "propose",       "inputs": ["address[]","uint256[]","bytes[]","string"], "stateMutability": "nonpayable" },
  { "name": "castVote",      "inputs": [{"name":"proposalId","type":"uint256"},{"name":"support","type":"uint8"}], "stateMutability": "nonpayable" },
  { "name": "state",         "inputs": [{"name":"proposalId","type":"uint256"}], "outputs": [{"type":"uint8"}], "stateMutability": "view" },
  { "name": "proposalVotes", "inputs": [{"name":"proposalId","type":"uint256"}], "outputs": [{"name":"againstVotes","type":"uint256"},{"name":"forVotes","type":"uint256"},{"name":"abstainVotes","type":"uint256"}], "stateMutability": "view" },
  { "name": "queue",         "inputs": [{"name":"proposalId","type":"uint256"}], "stateMutability": "nonpayable" },
  { "name": "execute",       "inputs": [{"name":"proposalId","type":"uint256"}], "stateMutability": "payable" },
  { "name": "hasVoted",      "inputs": [{"name":"proposalId","type":"uint256"},{"name":"account","type":"address"}], "outputs": [{"type":"bool"}], "stateMutability": "view" },
  { "name": "quorum",        "inputs": [{"name":"blockNumber","type":"uint256"}], "outputs": [{"type":"uint256"}], "stateMutability": "view" }
]
```

**ProposalState enum:** `0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed`

**Governance params:**
- Voting period: 3 days
- Quorum: 10% of supply
- Timelock delay: 24 hours
- Min $CATCH to propose: 10,000 CATCH

---

## Token Gate Logic

The `Portfolio`, `Governance`, and other protected pages require:
- Wallet connected (any chain)
- Hold ≥ **10,000,000 $EVA** on **Avalanche mainnet (43114)**

Check via ERC-20 `balanceOf`:
```
Contract: 0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672
Chain: 43114 (Avalanche C-Chain)
Min balance: 10_000_000 * 1e18 (wei)
```

---

## Key Actions an Agent Can Take

### 1. Check current fundraising round
```
Call: currentRoundId() → uint256
Call: getRound(roundId) → tuple
Contract: 0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C (Fuji)
```

### 2. Invest in the fund
```
Call: invest(roundId) payable with AVAX amount
Min: 0.1 AVAX | Max: 200 AVAX (Round 1)
Contract: 0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C (Fuji)
```

### 3. Read NAV
```
Call: navPerToken() → uint256 (in wei, divide by 1e18 for AVAX)
```

### 4. Vote on a governance proposal
```
Call: castVote(proposalId, support)
support: 0=Against, 1=For, 2=Abstain
Requires: hold $CATCH, proposal in Active state
```

### 5. Check $EVA balance (for token gate)
```
Call: balanceOf(address) on 0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672 (mainnet 43114)
```

### 6. Buy $EVA (to gain access)
```
URL: https://arenatrade.ai/token/0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672
Alt: https://www.paraswap.io/#/?network=avalanche&buy=0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672
```

---

## Tokenomics Summary

| Round | Target (AVAX) | Price (AVAX/$CATCH) | Duration |
|-------|--------------|---------------------|---------|
| 1 | 10,000 | 0.0025 | 1 month (Feb 2026) |
| 2 | 20,000 | NAV × 0.90 | 2 months (Apr–May 2026) |
| 3 | 35,000 | NAV × 0.95 | 4 months (Sep–Dec 2026) |

**Max supply:** ~24M $CATCH (investor rounds) + 50% governance reserve
**Team:** 10% with 6-month cliff, 2-year vest
**LP tokens:** burned to dead address (permanent liquidity)
**Buyback:** 10% of every card sale → buy $CATCH → grow LP

---

## Source Code
- Frontend: `/src/` (React + Vite + wagmi + RainbowKit)
- Contracts: `/contracts/contracts/`
- Docs: `/docs/`

## Full Agent Integration Docs
See [`docs/agent-integration.md`](./docs/agent-integration.md) for deeper technical reference.
