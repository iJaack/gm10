# Gem Mint Strategy ($CATCH)

Pokemon-card-first protocol infrastructure with Avalanche-based accounting, public mechanics, and a live Fuji testnet buy flow.

## Snapshot

- Public buy flow: `Fuji testnet`
- Canonical accounting unit: `USDT`
- Canonical governance chain: `Avalanche`
- Core focus: `high-grade Pokemon cards`

---

## Current direction

The repo is being refactored toward:

- a slimmer deployable V3 proxy implementation
- companion registry/accounting contracts
- per-asset purchase approvals
- per-position sale approvals
- mandatory realized-profit split:
  - `25%` treasury reinvestment
  - `40%` holder claim bucket
  - `35%` LP replenishment
    - half market-buys `$CATCH`
    - half buys or retains `$AVAX`
    - resulting liquidity is added 50/50 to LFJ and Pharaoh, with LFJ LP burned
- wallet-level reporting
- Pokemon-first website copy and tokenomics

---

## Fuji references

| Contract | Address |
| :--- | :--- |
| **$CATCH Token (Proxy)** | [`0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C`](https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C) |
| **Governance** | [`0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf`](https://testnet.snowtrace.io/address/0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf) |
| **Timelock** | [`0x73cBa10f55251da73423c7Ea76EC4743F5F583d3`](https://testnet.snowtrace.io/address/0x73cBa10f55251da73423c7Ea76EC4743F5F583d3) |
| **DEX Router** | Trader Joe V2.1 |

The Fuji deployment is still behind the documented V3 architecture. See the website pages and [`SKILL.md`](./SKILL.md) for the current target model.

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js 20.x (LTS)
*   Metamask or generic Web3 wallet

### Installation
```bash
# Install dependencies
nvm use
npm install

# Run Frontend
npm run dev
```

### Smart Contract Deployment
```bash
cd contracts
nvm use
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

*   **Phase 1 (Now)**: Fuji testnet buy flow, contract refactor, website/docs alignment.
*   **Phase 2**: Mainnet launch prep, first card lanes, and rollout hardening.
*   **Phase 3**: Hybrid governance for rounds 2 & 3.
*   **Phase 4**: Maturity, broader governance, and fuller redemption tooling.

---

*Gem Mint Strategy is an experiment in bringing serious Pokemon-card exposure onto cleaner onchain rails. Participate responsibly.*
