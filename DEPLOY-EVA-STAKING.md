# Deploy EVAStaking to Fuji

## Prerequisites
- Fuji AVAX for gas (~0.5 AVAX should be plenty)
- Either: Ledger connected OR a software private key

## Option A: Deploy with Ledger (recommended)
```bash
cd contracts
npx hardhat run scripts/deploy-eva-staking.js --network fuji
```
Approve the transactions on your Ledger (Ethereum app open).

## Option B: Deploy with Software Key
1. Add to `contracts/.env`:
   ```
   PRIVATE_KEY=0x<your-testnet-private-key>
   ```
2. Fund the wallet with Fuji AVAX from https://core.app/tools/testnet-faucet/
3. Deploy:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy-eva-staking.js --network fuji
   ```

## After Deployment
1. Copy the proxy address from the output
2. Create `.env.local` in the project root:
   ```
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
   VITE_EVA_TOKEN_ADDRESS=0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672
   VITE_EVA_STAKING_ADDRESS=0x<DEPLOYED_PROXY_ADDRESS>
   VITE_MIN_EVA_HOLD=10000000
   VITE_MIN_EVA_STAKE=10000000
   ```

## Verify on Snowtrace
```bash
cd contracts
npx hardhat verify --network fuji <IMPLEMENTATION_ADDRESS>
```

## Smoke Test
```bash
STAKING=0x<PROXY_ADDRESS>
RPC=https://api.avax-test.network/ext/bc/C/rpc

cast call $STAKING "MIN_STAKE()(uint256)" --rpc-url $RPC
# Expected: 10000000000000000000000000 (10M * 1e18)

cast call $STAKING "LOCK_PERIOD()(uint256)" --rpc-url $RPC
# Expected: 2592000 (30 days in seconds)

cast call $STAKING "canInvest(address)(bool)" 0x0000000000000000000000000000000000000001 --rpc-url $RPC
# Expected: false
```

## Note on $EVA Token on Fuji
The deploy script defaults to the mainnet $EVA token address (`0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672`).
On Fuji, this address has no deployed contract — that's fine for testing the staking contract itself,
but `stake()` calls will revert until either:
- A mock ERC-20 is deployed on Fuji and the staking contract is re-deployed pointing to it
- OR you test on mainnet with the real $EVA token

For Fuji testing of the full stake flow, deploy a mock ERC-20 first and set `EVA_TOKEN_ADDRESS` in env.
