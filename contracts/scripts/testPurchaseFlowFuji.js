const hre = require("hardhat");
const { ethers } = hre;
const deployments = require("../deployments.json");
const {
  ensureFundingConfirmed,
  resolvePurchaseFundingMode,
} = require("./lib/purchaseFundingMode");

const DEPLOYER_EOA = "0x5cA0A679025B6c7dA08a70be3b244399fF0D7813";
const FUND_ABI = [
  "function currentRoundId() view returns (uint256)",
  "function getRound(uint256) view returns ((uint256 roundId,uint256 targetAmount,uint256 raisedAmount,uint256 tokenPrice,uint256 minInvestment,uint256 maxInvestment,uint256 startTime,uint256 endTime,bool isActive,bool isFinalized))",
  "function stableAccounting() view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function invest(uint256) payable",
  "function confirmPurchaseFunding(bytes32,address,uint256,uint32,address,bytes32,bytes32)",
  "function releasePurchaseFunds(bytes32,uint256)",
  "function recordCollectiblePosition(bytes32,(uint8,bytes32,address,bytes32,uint256,bytes32,bytes32,bytes32,bytes32,uint256,bytes32,bytes32))",
  "function hasRole(bytes32,address) view returns (bool)",
];

const REGISTRY_ABI = [
  "function collectiblePositionCount() view returns (uint256)",
  "function setChainSafe(uint32,address,bytes32,bytes32,bool)",
  "function setMarketplaceApproval(bytes32,bool)",
  "function authorizePurchase(bytes32,uint32,bytes32,bytes32,uint256,bytes32)",
  "function getPurchaseAuthorization(bytes32) view returns ((bytes32 purchaseKey,uint8 status,uint32 chainEid,bytes32 marketplaceId,bytes32 assetRef,address fundingToken,uint256 maxSpendUsdt6,uint256 releasedUsdt6,address destinationSafe,bytes32 destinationSafeAlt,uint256 approvedAt,bytes32 mandateHash,bytes32 executionRef,bytes32 settlementRef,bytes32 proofHash))",
  "function recordPurchaseExecution(bytes32,bytes32,bytes32,bytes32)",
  "function getCollectiblePosition(uint256) view returns ((uint256 id,bytes32 originPurchaseKey,uint32 chainEid,bytes32 marketplaceId,uint8 custodyMode,bytes32 tokenStandard,address evmCollection,bytes32 nonEvmCollection,uint256 tokenId,bytes32 nonEvmTokenId,bytes32 externalAssetId,bytes32 categoryId,bytes32 marketplaceProvenanceRef,uint256 acquisitionPriceUsdt6,uint256 currentValueUsdt6,uint256 lastNavMarkUsdt6,uint256 acquisitionDate,uint256 lastValuationAt,uint8 status,bytes32 metadataHash,bytes32 proofHash))",
];

const MANAGER_ROLE = ethers.id("MANAGER_ROLE");
const GOVERNANCE_ROLE = ethers.id("GOVERNANCE_ROLE");

async function ensureActiveRound(fund, signer, investAmountWei) {
  const currentRoundId = await fund.currentRoundId();
  const round = await fund.getRound(currentRoundId);

  if (!round.isActive || round.isFinalized) {
    throw new Error(`Current round ${currentRoundId} is not active on Fuji`);
  }

  if (investAmountWei > 0n) {
    console.log(`Seeding treasury with ${ethers.formatEther(investAmountWei)} AVAX through round ${currentRoundId}...`);
    const tx = await fund.invest(currentRoundId, { value: investAmountWei });
    await tx.wait();
  }

  return currentRoundId;
}

async function ensureRequiredRoles(fund, signerAddress) {
  const [hasGovernance, hasManager] = await Promise.all([
    fund.hasRole(GOVERNANCE_ROLE, signerAddress),
    fund.hasRole(MANAGER_ROLE, signerAddress),
  ]);

  if (!hasManager) {
    throw new Error(`${signerAddress} does not hold MANAGER_ROLE on the fund`);
  }
  if (!hasGovernance) {
    throw new Error(`${signerAddress} does not hold GOVERNANCE_ROLE on the fund`);
  }
}

async function main() {
  if (hre.network.name !== "fuji") {
    throw new Error("This script is only intended for Fuji");
  }

  const deploymentKey = process.env.DEPLOYMENT_KEY || "fuji";
  const deployment = deployments[deploymentKey];
  if (!deployment?.proxy || !deployment?.portfolioRegistry) {
    throw new Error(`Fuji deployment metadata is incomplete for key ${deploymentKey}`);
  }
  const purchaseFundingMode = resolvePurchaseFundingMode(deployment);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  if (signerAddress.toLowerCase() !== DEPLOYER_EOA.toLowerCase()) {
    throw new Error(`Signer must be the Fuji deployer EOA ${DEPLOYER_EOA}, received ${signerAddress}`);
  }
  console.log(`Using signer: ${signerAddress}`);
  console.log(`Using deployment key: ${deploymentKey}`);
  console.log(`Using purchase funding mode: ${purchaseFundingMode}`);

  const fund = new ethers.Contract(deployment.proxy, FUND_ABI, signer);
  const registry = new ethers.Contract(deployment.portfolioRegistry, REGISTRY_ABI, signer);

  await ensureRequiredRoles(fund, signerAddress);

  const roundId = await ensureActiveRound(fund, signer, ethers.parseEther(process.env.FUJI_PURCHASE_TEST_AVAX || "2"));
  const positionCountBefore = await registry.collectiblePositionCount();
  const runTag = process.env.FUJI_PURCHASE_RUN_TAG || `${Math.floor(Date.now() / 1000)}`;

  const Collection = await ethers.getContractFactory("MockGm10Collection");
  const collectionAlpha = await Collection.deploy("GM10 Test Slabs Alpha", "GM10A", `ipfs://gm10-alpha/${runTag}/`);
  await collectionAlpha.waitForDeployment();
  const collectionBeta = await Collection.deploy("GM10 Test Slabs Beta", "GM10B", `ipfs://gm10-beta/${runTag}/`);
  await collectionBeta.waitForDeployment();

  const mintAlphaTx = await collectionAlpha.mint(signerAddress);
  await mintAlphaTx.wait();
  const mintBetaTx = await collectionBeta.mint(signerAddress);
  await mintBetaTx.wait();

  const tokenIdAlpha = 1n;
  const tokenIdBeta = 1n;
  const chainEid = 43113;
  const marketAlpha = ethers.id("GM10_TEST_MARKET_ALPHA");
  const marketBeta = ethers.id("GM10_TEST_MARKET_BETA");
  const purchaseAlpha = ethers.id(`fuji-purchase-alpha-${runTag}`);
  const purchaseBeta = ethers.id(`fuji-purchase-beta-${runTag}`);
  const alphaPositionId = positionCountBefore + 1n;
  const betaPositionId = positionCountBefore + 2n;

  console.log("Configuring chain safe and marketplaces...");
  await (await registry.setChainSafe(chainEid, signerAddress, ethers.ZeroHash, ethers.id("FUJI_OPS_SAFE"), true)).wait();
  await (await registry.setMarketplaceApproval(marketAlpha, true)).wait();
  await (await registry.setMarketplaceApproval(marketBeta, true)).wait();

  console.log("Authorizing purchases...");
  await (await registry.authorizePurchase(
    purchaseAlpha,
    chainEid,
    marketAlpha,
    ethers.id(`alpha-asset-ref-${runTag}`),
    20_000_000n,
    ethers.id(`alpha-mandate-${runTag}`)
  )).wait();
  await (await registry.authorizePurchase(
    purchaseBeta,
    chainEid,
    marketBeta,
    ethers.id(`beta-asset-ref-${runTag}`),
    25_000_000n,
    ethers.id(`beta-mandate-${runTag}`)
  )).wait();

  await ensureFundingConfirmed(fund, registry, purchaseAlpha, 20_000_000n, `alpha-${runTag}`, purchaseFundingMode);
  await ensureFundingConfirmed(fund, registry, purchaseBeta, 25_000_000n, `beta-${runTag}`, purchaseFundingMode);

  console.log("Recording purchase execution...");
  await (await registry.recordPurchaseExecution(
    purchaseAlpha,
    ethers.id(`alpha-execution-${runTag}`),
    ethers.id(`alpha-settlement-${runTag}`),
    ethers.id(`alpha-proof-${runTag}`)
  )).wait();
  await (await registry.recordPurchaseExecution(
    purchaseBeta,
    ethers.id(`beta-execution-${runTag}`),
    ethers.id(`beta-settlement-${runTag}`),
    ethers.id(`beta-proof-${runTag}`)
  )).wait();

  console.log("Recording portfolio positions...");
  await (await fund.recordCollectiblePosition(purchaseAlpha, {
    custodyMode: 0,
    tokenStandard: ethers.id("ERC721"),
    evmCollection: await collectionAlpha.getAddress(),
    nonEvmCollection: ethers.ZeroHash,
    tokenId: tokenIdAlpha,
    nonEvmTokenId: ethers.ZeroHash,
    externalAssetId: ethers.id(`alpha-collectible-${runTag}`),
    categoryId: ethers.id("pokemon-slab"),
    marketplaceProvenanceRef: ethers.id(`alpha-marketplace-provenance-${runTag}`),
    acquisitionPriceUsdt6: 18_000_000n,
    metadataHash: ethers.id(`alpha-metadata-${runTag}`),
    proofHash: ethers.id(`alpha-position-proof-${runTag}`),
  })).wait();

  await (await fund.recordCollectiblePosition(purchaseBeta, {
    custodyMode: 0,
    tokenStandard: ethers.id("ERC721"),
    evmCollection: await collectionBeta.getAddress(),
    nonEvmCollection: ethers.ZeroHash,
    tokenId: tokenIdBeta,
    nonEvmTokenId: ethers.ZeroHash,
    externalAssetId: ethers.id(`beta-collectible-${runTag}`),
    categoryId: ethers.id("pokemon-slab"),
    marketplaceProvenanceRef: ethers.id(`beta-marketplace-provenance-${runTag}`),
    acquisitionPriceUsdt6: 22_000_000n,
    metadataHash: ethers.id(`beta-metadata-${runTag}`),
    proofHash: ethers.id(`beta-position-proof-${runTag}`),
  })).wait();

  const [stableAccounting, position1, position2] = await Promise.all([
    fund.stableAccounting(),
    registry.getCollectiblePosition(alphaPositionId),
    registry.getCollectiblePosition(betaPositionId),
  ]);

  console.log("ROUND_ID=" + roundId.toString());
  console.log("RUN_TAG=" + runTag);
  console.log("COLLECTION_ALPHA=" + await collectionAlpha.getAddress());
  console.log("COLLECTION_BETA=" + await collectionBeta.getAddress());
  console.log("POSITION_1_ID=" + alphaPositionId.toString());
  console.log("POSITION_1_COLLECTION=" + position1.evmCollection);
  console.log("POSITION_1_TOKEN_ID=" + position1.tokenId.toString());
  console.log("POSITION_2_ID=" + betaPositionId.toString());
  console.log("POSITION_2_COLLECTION=" + position2.evmCollection);
  console.log("POSITION_2_TOKEN_ID=" + position2.tokenId.toString());
  console.log("CANONICAL_PORTFOLIO_VALUE_USDT6=" + stableAccounting[0].toString());
  console.log("LIQUID_TREASURY_USDT6=" + stableAccounting[2].toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
