/**
 * Deploy a V2-compatible registry preloaded from the active legacy registry,
 * verify every imported position, then switch the fund's portfolioRegistry slot
 * through a temporary pointer-only UUPS implementation that returns the proxy to
 * the current fund implementation in the same Safe transaction.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... \
 *     npx hardhat run scripts/migratePortfolioRegistryV2.js --network avalanche
 *
 * Optional:
 *   FUND_PROXY_ADDRESS=0x...
 *   LEGACY_PORTFOLIO_REGISTRY_ADDRESS=0x...
 *   MIGRATED_PORTFOLIO_REGISTRY_ADDRESS=0x...
 *   POINTER_IMPLEMENTATION_ADDRESS=0x...
 *   FINAL_IMPLEMENTATION_ADDRESS=0x...
 *   DEPLOYMENT_KEY=avalanche
 */
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

const EIP170_LIMIT = 24576;
const OPERATION_CALL = 0;
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];
const REGISTRY_ABI = [
  "function collectiblePositionCount() view returns (uint256)",
  "function getCollectiblePosition(uint256) view returns ((uint256 id,bytes32 originPurchaseKey,uint32 chainEid,bytes32 marketplaceId,uint8 custodyMode,bytes32 tokenStandard,address evmCollection,bytes32 nonEvmCollection,uint256 tokenId,bytes32 nonEvmTokenId,bytes32 externalAssetId,bytes32 categoryId,bytes32 marketplaceProvenanceRef,uint256 acquisitionPriceUsdt6,uint256 currentValueUsdt6,uint256 lastNavMarkUsdt6,uint256 acquisitionDate,uint256 lastValuationAt,uint8 status,bytes32 metadataHash,bytes32 proofHash))",
];

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];
  if (!value) return "";
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

function loadDeployments() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) return { deploymentsPath, deployments: {} };
  return {
    deploymentsPath,
    deployments: JSON.parse(fs.readFileSync(deploymentsPath, "utf8")),
  };
}

async function assertDeployableSize(contractName) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const size = Math.max(0, ((artifact.deployedBytecode || "0x").length - 2) / 2);
  if (size > EIP170_LIMIT) {
    throw new Error(`${contractName} deployed bytecode is ${size} bytes, above EIP-170 limit ${EIP170_LIMIT}`);
  }
  console.log(`${contractName} deployed bytecode: ${size} bytes`);
}

function comparablePosition(position) {
  return {
    id: position.id.toString(),
    originPurchaseKey: position.originPurchaseKey,
    chainEid: Number(position.chainEid),
    marketplaceId: position.marketplaceId,
    custodyMode: Number(position.custodyMode),
    tokenStandard: position.tokenStandard,
    evmCollection: ethers.getAddress(position.evmCollection),
    nonEvmCollection: position.nonEvmCollection,
    tokenId: position.tokenId.toString(),
    nonEvmTokenId: position.nonEvmTokenId,
    externalAssetId: position.externalAssetId,
    categoryId: position.categoryId,
    marketplaceProvenanceRef: position.marketplaceProvenanceRef,
    acquisitionPriceUsdt6: position.acquisitionPriceUsdt6.toString(),
    currentValueUsdt6: position.currentValueUsdt6.toString(),
    lastNavMarkUsdt6: position.lastNavMarkUsdt6.toString(),
    acquisitionDate: position.acquisitionDate.toString(),
    lastValuationAt: position.lastValuationAt.toString(),
    status: Number(position.status),
    metadataHash: position.metadataHash,
    proofHash: position.proofHash,
  };
}

async function verifyRegistryCopy(source, target, count) {
  const targetCount = await target.collectiblePositionCount();
  if (targetCount !== count) {
    throw new Error(`Migrated registry count ${targetCount.toString()} does not match source ${count.toString()}`);
  }
  for (let positionId = 1n; positionId <= count; positionId++) {
    const sourcePosition = comparablePosition(await source.getCollectiblePosition(positionId));
    const targetPosition = comparablePosition(await target.getCollectiblePosition(positionId));
    if (JSON.stringify(sourcePosition) !== JSON.stringify(targetPosition)) {
      throw new Error(`Position ${positionId.toString()} differs after migration`);
    }
  }
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const signerAddress = await signer.getAddress();
  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || deployments[network] || {};

  const safeAddress = requireAddress("SAFE_ADDRESS");
  const proxy = optionalAddress("FUND_PROXY_ADDRESS") || (deployment.proxy ? ethers.getAddress(deployment.proxy) : "");
  if (!proxy) throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");

  const legacyRegistry =
    optionalAddress("LEGACY_PORTFOLIO_REGISTRY_ADDRESS") ||
    (deployment.portfolioRegistry ? ethers.getAddress(deployment.portfolioRegistry) : "");
  if (!legacyRegistry) throw new Error("LEGACY_PORTFOLIO_REGISTRY_ADDRESS or deployments.json portfolioRegistry is required");

  const finalImplementation =
    optionalAddress("FINAL_IMPLEMENTATION_ADDRESS") ||
    ethers.getAddress(await upgrades.erc1967.getImplementationAddress(proxy));

  console.log("Migrating GM10 portfolio registry to V2-compatible storage");
  console.log("  Network        :", network);
  console.log("  Deployment key :", deploymentKey);
  console.log("  Proxy          :", proxy);
  console.log("  Safe           :", safeAddress);
  console.log("  Signer         :", signerAddress);
  console.log("  Final impl     :", finalImplementation);
  console.log("  Source registry:", legacyRegistry);

  await assertDeployableSize("Gm10MigratedPortfolioRegistryV2");
  await assertDeployableSize("Gm10RegistryPointerUpgrade");

  const source = new ethers.Contract(legacyRegistry, REGISTRY_ABI, signer);
  const sourceCount = await source.collectiblePositionCount();
  if (sourceCount === 0n) throw new Error("Source registry has no positions to migrate");

  let migratedRegistry = optionalAddress("MIGRATED_PORTFOLIO_REGISTRY_ADDRESS");
  if (!migratedRegistry) {
    const MigratedRegistry = await ethers.getContractFactory("Gm10MigratedPortfolioRegistryV2");
    const registry = await MigratedRegistry.deploy(proxy, legacyRegistry, sourceCount);
    await registry.waitForDeployment();
    migratedRegistry = await registry.getAddress();
  }
  migratedRegistry = ethers.getAddress(migratedRegistry);
  console.log("  Migrated registry:", migratedRegistry);

  const target = new ethers.Contract(migratedRegistry, REGISTRY_ABI, signer);
  await verifyRegistryCopy(source, target, sourceCount);
  console.log("  Verified positions:", sourceCount.toString());

  let pointerImplementation = optionalAddress("POINTER_IMPLEMENTATION_ADDRESS");
  if (!pointerImplementation) {
    const PointerUpgrade = await ethers.getContractFactory("Gm10RegistryPointerUpgrade");
    const pointer = await PointerUpgrade.deploy();
    await pointer.waitForDeployment();
    pointerImplementation = await pointer.getAddress();
  }
  pointerImplementation = ethers.getAddress(pointerImplementation);
  console.log("  Pointer impl     :", pointerImplementation);

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const pointerInterface = new ethers.Interface([
    "function setPortfolioRegistryAndReturn(address _finalImplementation,address _portfolioRegistry)",
  ]);
  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const pointerData = pointerInterface.encodeFunctionData("setPortfolioRegistryAndReturn", [
    finalImplementation,
    migratedRegistry,
  ]);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [pointerImplementation, pointerData]);

  const nonce = await safe.nonce();
  console.log("  Safe nonce      :", nonce.toString());
  const tx = await safe.execTransaction(
    proxy,
    0,
    upgradeData,
    OPERATION_CALL,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    prevalidatedSignature(signerAddress)
  );
  console.log("  Pointer tx      :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block :", receipt.blockNumber);

  const liveImplementation = await upgrades.erc1967.getImplementationAddress(proxy);
  if (!sameAddress(liveImplementation, finalImplementation)) {
    throw new Error(`Proxy implementation is ${liveImplementation}, expected ${finalImplementation}`);
  }
  const fund = await ethers.getContractAt("GemMintStrategyFundV6", proxy, signer);
  const liveRegistry = await fund.portfolioRegistry();
  if (!sameAddress(liveRegistry, migratedRegistry)) {
    throw new Error(`Fund registry is ${liveRegistry}, expected ${migratedRegistry}`);
  }

  deployments[deploymentKey] = {
    ...deployment,
    implementation: liveImplementation,
    portfolioRegistryV1: deployment.portfolioRegistryV1 || legacyRegistry,
    portfolioRegistryV2Migrated: migratedRegistry,
    portfolioRegistry: migratedRegistry,
    lastPortfolioRegistryMigration: {
      sourceRegistry: legacyRegistry,
      migratedRegistry,
      pointerImplementation,
      finalImplementation,
      positionCount: sourceCount.toString(),
      tx: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

  console.log("  Live impl       :", liveImplementation);
  console.log("  Fund registry   :", liveRegistry);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
