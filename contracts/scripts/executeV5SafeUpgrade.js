/**
 * Execute the V5 upgrade through a 1/1 Safe whose owner is the connected signer.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x... IMPLEMENTATION_V5_ADDRESS=0x... \
 *   PORTFOLIO_REGISTRY_V2_ADDRESS=0x... SETTLEMENT_TOKEN_ADDRESS=0x... SETTLEMENT_TOKEN_DECIMALS=6 \
 *     npx hardhat run scripts/executeV5SafeUpgrade.js --network avalanche
 */
const hre = require("hardhat");
const { ethers, network } = hre;

const OPERATION_CALL = 0;

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  const v = "01";
  return `${r}${s.slice(2)}${v}`;
}

async function executeSafeCall({ safe, signerAddress, to, data, label }) {
  const nonce = await safe.nonce();
  console.log(`${label}: Safe nonce ${nonce.toString()}`);
  const tx = await safe.execTransaction(
    to,
    0,
    data,
    OPERATION_CALL,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    prevalidatedSignature(signerAddress)
  );
  console.log(`${label}: submitted ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`${label}: confirmed in block ${receipt.blockNumber}`);
}

async function main() {
  const impersonatedSigner = process.env.IMPERSONATE_SIGNER_ADDRESS;
  let signer;
  if (network.name === "hardhat" && impersonatedSigner) {
    const forkUrl = process.env.FORK_RPC_URL || process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
    await network.provider.request({
      method: "hardhat_reset",
      params: [{ forking: { jsonRpcUrl: forkUrl } }],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ethers.getAddress(impersonatedSigner)],
    });
    signer = await ethers.getSigner(ethers.getAddress(impersonatedSigner));
  } else if ((network.name === "localhost" || network.name === "avalancheFork") && impersonatedSigner) {
    const owner = ethers.getAddress(impersonatedSigner);
    await network.provider.request({
      method: "anvil_impersonateAccount",
      params: [owner],
    });
    await network.provider.request({
      method: "anvil_setBalance",
      params: [owner, "0x56BC75E2D63100000"],
    });
    signer = await ethers.getSigner(owner);
  } else {
    [signer] = await ethers.getSigners();
  }
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const signerAddress = await signer.getAddress();
  const safeAddress = requireAddress("SAFE_ADDRESS");
  const proxy = requireAddress("FUND_PROXY_ADDRESS");
  const implementationV5 = requireAddress("IMPLEMENTATION_V5_ADDRESS");
  const registryV2 = requireAddress("PORTFOLIO_REGISTRY_V2_ADDRESS");
  const settlementToken = requireAddress("SETTLEMENT_TOKEN_ADDRESS");
  const settlementTokenDecimals = Number(process.env.SETTLEMENT_TOKEN_DECIMALS || "6");
  const maxStaleness = BigInt(process.env.MAX_PRICE_FEED_STALENESS || "86400");

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();

  console.log("Safe          :", safeAddress);
  console.log("Signer        :", signerAddress);
  console.log("Safe owners   :", owners.join(", "));
  console.log("Safe threshold:", threshold.toString());

  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

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

  await executeSafeCall({
    safe,
    signerAddress,
    to: proxy,
    data: upgradeData,
    label: "Upgrade to V5",
  });

  await executeSafeCall({
    safe,
    signerAddress,
    to: proxy,
    data: settlementData,
    label: "Allowlist settlement token",
  });

  const implementation = await hre.upgrades.erc1967.getImplementationAddress(proxy);
  const fund = await ethers.getContractAt("GemMintStrategyFundV5", proxy, signer);

  console.log("Implementation:", implementation);
  console.log("Registry V2    :", await fund.portfolioRegistry());
  console.log("USDC allowed   :", await fund.approvedSaleSettlementToken(settlementToken));
  console.log("Staleness cap  :", (await fund.maxPriceFeedStaleness()).toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
