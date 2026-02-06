# Gem Mint Strategy ($CATCH) 💎

**Tokenized exposure to the high-end graded Pokemon card market on Avalanche.**

Gem Mint Strategy combines the nostalgia of collecting with the power of DeFi. Each $CATCH token represents fractional ownership in a portfolio of museum-quality graded cards (PSA/BGS 9-10), managed on-chain and liquid 24/7.

## 🚀 Key Features

*   **Fractional Ownership**: Own a piece of history (Base Set Charizard, Illustrator Pikachu) starting from $2.50.
*   **Onchain Transparency**: All cards are held as NFTs in a visible treasury. NAV is verifiable on-chain.
*   **Permanent Liquidity**: Liquidity Pool (LP) tokens are **burned**, ensuring a permanent trading floor that can't be rug-pulled.
*   **Automated Buybacks**: 10% of every card sale automatically buys back $CATCH and grows the LP.
*   **Dynamic Pricing**: Fundraising rounds occur at NAV (Net Asset Value) with discounts for later participants.

---

## 🗳️ Governance V2: Budget Approval Model

We use a decentralized governance model designed for agility and security.

*   **Budget Approval**: Token holders vote to approve a spending budget (e.g., "500 AVAX for Vintage Cards").
*   **Manager Execution**: The Manager role can instantly execute purchases *only* within that approved budget.
*   **Voting Specs**:
    *   **Token**: $CATCH (`ERC20Votes`)
    *   **Voting Period**: **3 Days**
    *   **Quorum**: **10%** of supply
    *   **Execution**: Automated via Timelock (24h delay)

---

## 📜 Deployed Contracts (Fuji Testnet)

| Contract | Address |
| :--- | :--- |
| **$CATCH Token (Proxy)** | [`0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C`](https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C) |
| **Governance** | [`0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf`](https://testnet.snowtrace.io/address/0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf) |
| **Timelock** | [`0x73cBa10f55251da73423c7Ea76EC4743F5F583d3`](https://testnet.snowtrace.io/address/0x73cBa10f55251da73423c7Ea76EC4743F5F583d3) |
| **DEX Router** | Trader Joe V2.1 |

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js v18+
*   Metamask or generic Web3 wallet

### Installation
```bash
# Install dependencies
npm install

# Run Frontend
npm run dev
```

### Smart Contract Deployment
```bash
cd contracts
npm install
npx hardhat compile
# See package.json for deployment scripts
```

### Testing
```bash
# Frontend: typecheck + build
npm run check

# Full suite: frontend + contracts
npm test

# Contracts only
cd contracts
npm test

# Governance + upgrade simulation on a local Hardhat network
npx hardhat run scripts/simulateGovernanceScenario.js
```

---

## 🗺️ Roadmap

*   **Phase 1 (Now)**: Testnet Launch (Fuji), Smart Contract Verification, Community Building.
*   **Phase 2**: Round 1 Fundraising (10k AVAX), First Acquisitions.
*   **Phase 3**: Governance Activation, Rounds 2 & 3.
*   **Phase 4**: Maturity, DAO Transition, NAV Redemptions.

---

*Gem Mint Strategy is an experiment in decentralized asset management. Invest responsibly.*
