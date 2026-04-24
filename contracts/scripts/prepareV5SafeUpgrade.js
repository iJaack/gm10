/**
 * Print a Safe Transaction Builder batch for the V5 upgrade.
 *
 * Usage:
 *   FUND_PROXY_ADDRESS=0x... IMPLEMENTATION_V5_ADDRESS=0x... PORTFOLIO_REGISTRY_V2_ADDRESS=0x... \
 *   SETTLEMENT_TOKEN_ADDRESS=0x... SETTLEMENT_TOKEN_DECIMALS=6 \
 *     npx hardhat run scripts/prepareV5SafeUpgrade.js --network avalanche
 */
const hre = require("hardhat");
const { ethers } = hre;

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const proxy = requireAddress("FUND_PROXY_ADDRESS");
  const implementationV5 = requireAddress("IMPLEMENTATION_V5_ADDRESS");
  const registryV2 = requireAddress("PORTFOLIO_REGISTRY_V2_ADDRESS");
  const settlementToken = requireAddress("SETTLEMENT_TOKEN_ADDRESS");
  const settlementTokenDecimals = Number(process.env.SETTLEMENT_TOKEN_DECIMALS || "6");
  const maxStaleness = BigInt(process.env.MAX_PRICE_FEED_STALENESS || "86400");

  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const fundV5Interface = new ethers.Interface([
    "function initializeV5(address _portfolioRegistryV2,uint256 _maxPriceFeedStaleness)",
    "function setSaleSettlementToken(address _token,bool _allowed,uint8 _decimals)",
  ]);

  const initData = fundV5Interface.encodeFunctionData("initializeV5", [registryV2, maxStaleness]);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [implementationV5, initData]);
  const settlementData = fundV5Interface.encodeFunctionData("setSaleSettlementToken", [
    settlementToken,
    true,
    settlementTokenDecimals,
  ]);

  const batch = {
    version: "1.0",
    chainId: String(chainId),
    createdAt: Date.now(),
    meta: {
      name: "GM10 V5 security upgrade",
      description: "Upgrade GemMintStrategyFund proxy to V5, initialize Registry V2, and allowlist USDC settlement.",
      txBuilderVersion: "1.18.0",
      createdFromSafeAddress: "",
      createdFromOwnerAddress: "",
      checksum: "",
    },
    transactions: [
      {
        to: proxy,
        value: "0",
        data: upgradeData,
        contractMethod: {
          inputs: [
            { internalType: "address", name: "newImplementation", type: "address" },
            { internalType: "bytes", name: "data", type: "bytes" },
          ],
          name: "upgradeToAndCall",
          payable: false,
        },
        contractInputsValues: {
          newImplementation: implementationV5,
          data: initData,
        },
      },
      {
        to: proxy,
        value: "0",
        data: settlementData,
        contractMethod: {
          inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "bool", name: "_allowed", type: "bool" },
            { internalType: "uint8", name: "_decimals", type: "uint8" },
          ],
          name: "setSaleSettlementToken",
          payable: false,
        },
        contractInputsValues: {
          _token: settlementToken,
          _allowed: "true",
          _decimals: String(settlementTokenDecimals),
        },
      },
    ],
  };

  console.log(JSON.stringify(batch, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
