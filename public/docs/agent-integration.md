# Agent Integration Guide — Gem Mint Strategy

This document is the authoritative technical reference for AI agents, bots, and programmatic clients integrating with the Gem Mint Strategy platform.

---

## Platform Overview

| Property | Value |
|----------|-------|
| Name | Gem Mint Strategy |
| Token | $CATCH |
| Chain | Avalanche Fuji Testnet (testnet) → Avalanche C-Chain (mainnet) |
| Access token | $EVA (Avalanche mainnet, min 10M) |
| Frontend | gm10.xyz |
| Fund model | NAV-based tokenized card portfolio |

---

## Networks

```
Avalanche C-Chain (mainnet)
  Chain ID: 43114
  RPC: https://api.avax.network/ext/bc/C/rpc
  Explorer: https://snowtrace.io

Avalanche Fuji Testnet
  Chain ID: 43113
  RPC: https://api.avax-test.network/ext/bc/C/rpc
  Explorer: https://testnet.snowtrace.io
```

---

## Deployed Contracts

### Fuji Testnet

| Name | Address | Note |
|------|---------|------|
| GemMintStrategyFund (Proxy) | `0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C` | Upgradeable proxy — main entry point |
| GemMintGovernor | `0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf` | OZ Governor Bravo |
| GemMintTimelock | `0x73cBa10f55251da73423c7Ea76EC4743F5F583d3` | 24h timelock |

### Avalanche Mainnet

| Name | Address | Note |
|------|---------|------|
| $EVA Token | `0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672` | Token gate — read balanceOf here |

---

## GemMintStrategyFund — Full Read Interface

### `currentRoundId() → uint256`
Returns the ID of the currently active fundraising round.

### `getRound(uint256 _roundId) → Round`
Returns full round info.

```solidity
struct Round {
  uint256 roundId;
  uint256 targetAmount;   // in wei (AVAX)
  uint256 raisedAmount;   // in wei (AVAX)
  uint256 tokenPrice;     // in wei (AVAX per $CATCH)
  uint256 minInvestment;  // in wei
  uint256 maxInvestment;  // in wei
  uint256 startTime;      // unix timestamp
  uint256 endTime;        // unix timestamp
  bool isActive;
  bool isFinalized;
}
```

### `navPerToken() → uint256`
Current Net Asset Value per $CATCH token, in wei. Divide by `1e18` for AVAX value.

---

## GemMintStrategyFund — Write Interface

### `invest(uint256 _roundId) payable`
Buy $CATCH in the active fundraising round.

```
Value: AVAX amount to invest (wei)
Constraints:
  - round must be active and not finalized
  - msg.value >= minInvestment
  - msg.value <= maxInvestment
  - round not ended
```

Example (ethers.js):
```js
const fund = new ethers.Contract(FUND_ADDRESS, FUND_ABI, signer);
const tx = await fund.invest(roundId, { value: ethers.parseEther("1.0") });
await tx.wait();
```

Example (viem):
```ts
const hash = await walletClient.writeContract({
  address: FUND_ADDRESS,
  abi: FUND_ABI,
  functionName: 'invest',
  args: [BigInt(roundId)],
  value: parseEther('1.0'),
  chain: avalancheFuji,
});
```

---

## GemMintGovernor — Full Interface

### Read functions

| Function | Returns | Description |
|----------|---------|-------------|
| `state(uint256 proposalId)` | `uint8` | ProposalState enum |
| `proposalVotes(uint256 proposalId)` | `(against, for, abstain)` | Vote counts in wei |
| `proposalSnapshot(uint256 proposalId)` | `uint256` | Snapshot block |
| `proposalDeadline(uint256 proposalId)` | `uint256` | Deadline block |
| `proposalProposer(uint256 proposalId)` | `address` | Who proposed |
| `hasVoted(uint256 proposalId, address account)` | `bool` | Has account voted |
| `quorum(uint256 blockNumber)` | `uint256` | Quorum at block (wei) |

**ProposalState values:**
```
0 = Pending
1 = Active      ← can vote
2 = Canceled
3 = Defeated
4 = Succeeded   ← can queue
5 = Queued      ← can execute after timelock
6 = Expired
7 = Executed
```

### Write functions

#### `propose(address[] targets, uint256[] values, bytes[] calldatas, string description)`
Create a governance proposal. Requires ≥ 10,000 $CATCH.

#### `castVote(uint256 proposalId, uint8 support)`
Vote on an active proposal.
- `0` = Against
- `1` = For
- `2` = Abstain

#### `castVoteWithReason(uint256 proposalId, uint8 support, string reason)`
Vote with an explanation (emitted as event, improves transparency).

#### `queue(uint256 proposalId)`
Queue a succeeded proposal for execution. Starts the 24h timelock.

#### `execute(uint256 proposalId) payable`
Execute a queued proposal after the timelock delay.

---

## Token Gate — $EVA Access Check

Protected pages (Portfolio, Governance) require ≥ 10,000,000 $EVA on Avalanche mainnet.

```js
// ERC-20 balanceOf check
const MIN_EVA = BigInt("10000000") * BigInt(1e18);
const EVA_ADDRESS = "0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672";
const AVAX_MAINNET = 43114;

const balance = await publicClient.readContract({
  address: EVA_ADDRESS,
  abi: [{ name: 'balanceOf', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }],
  functionName: 'balanceOf',
  args: [walletAddress],
  chainId: AVAX_MAINNET,
});

const hasAccess = balance >= MIN_EVA;
```

**How to acquire $EVA:**
- ArenaTrade: `https://arenatrade.ai/token/0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672`
- ParaSwap: `https://www.paraswap.io/#/?network=avalanche&buy=0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672`

---

## Common Agent Workflows

### Check fund status
```
1. Call currentRoundId() on GemMintStrategyFund
2. Call getRound(roundId) → inspect isActive, raisedAmount, targetAmount, endTime
3. Call navPerToken() → current NAV
```

### Invest programmatically
```
1. Check getRound(roundId).isActive == true
2. Verify msg.value within [minInvestment, maxInvestment]
3. Call invest(roundId) with AVAX value
4. Wait for tx receipt
```

### Monitor governance
```
1. Listen for ProposalCreated events on GemMintGovernor
2. For each proposal: call state(proposalId)
3. If state == 1 (Active): can call castVote
4. If state == 4 (Succeeded): call queue
5. After timelock (24h): call execute
```

### Check if wallet can vote
```
1. Call hasVoted(proposalId, wallet) → bool
2. Call state(proposalId) == 1 (Active)
3. Check $CATCH balance > 0 (any amount allows voting)
```

---

## Environment Variables (Frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_EVA_TOKEN_ADDRESS` | `0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672` | $EVA contract (mainnet) |
| `VITE_MIN_EVA_HOLD` | `10000000` | Min $EVA to hold (units, not wei) |
| `VITE_EVA_CHAIN_ID` | `43114` | Chain for $EVA balance read |
| `VITE_WALLETCONNECT_PROJECT_ID` | — | WalletConnect project ID |

---

## Tokenomics Reference

```
Total supply: ~24M $CATCH (investor rounds) + 12M governance reserve
Fundraising:
  Round 1: 10,000 AVAX target, 0.0025 AVAX/CATCH, 4M tokens issued
  Round 2: 20,000 AVAX target, NAV×0.90 discount, ~7.4M tokens
  Round 3: 35,000 AVAX target, NAV×0.95 discount, ~10.2M tokens
Team: 10% (6-month cliff, 2-year vesting)
LP: permanently burned to 0x000...dEaD
Buyback: 10% of card sale proceeds → buy $CATCH → add to LP
```

---

## Source Layout

```
ash-strategy-web/
├── SKILL.md                        ← quick agent reference (start here)
├── docs/
│   └── agent-integration.md        ← this file (deep technical)
├── src/
│   ├── hooks/useEVAAccess.ts       ← token gate logic
│   ├── wagmi.ts                    ← chain config
│   ├── components/
│   │   ├── TokenGate.tsx           ← $EVA gating UI
│   │   └── EVAStakingPanel.tsx     ← staking UI
│   └── pages/
│       ├── Fundraising.tsx         ← invest UI + FUND_ABI
│       └── Governance.tsx          ← vote UI + GOVERNANCE_ABI
└── contracts/contracts/
    ├── GemMintStrategyFundV2.sol   ← main fund logic
    ├── GemMintGovernor.sol         ← OZ Governor
    ├── GemMintTimelock.sol         ← timelock
    └── EVAStaking.sol              ← $EVA staking
```

---

## Links

| Resource | URL |
|----------|-----|
| Frontend | https://gm10.xyz |
| GitHub | https://github.com/iJaack/gm10 |
| $EVA on ArenaTrade | https://arenatrade.ai/token/0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672 |
| $EVA on ParaSwap | https://www.paraswap.io/#/?network=avalanche&buy=0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672 |
| Fund contract (Fuji) | https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C |
| Governor (Fuji) | https://testnet.snowtrace.io/address/0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf |
