const hre = require("hardhat");
const { ethers } = hre;
const deployments = require("../deployments.json");

const DEPLOYER_EOA = "0x5cA0A679025B6c7dA08a70be3b244399fF0D7813";
const PURCHASE_STATUS = {
  None: 0,
  Approved: 1,
  FundsReleased: 2,
  FundingConfirmed: 3,
  Executed: 4,
  PositionRecorded: 5,
  Cancelled: 6,
};

const PURCHASE_FUNDING_MODES = {
  Confirm: "confirmPurchaseFunding",
  LegacyRelease: "legacyRelease",
};

const FUND_ABI = [
  "function confirmPurchaseFunding(bytes32,address,uint256,uint32,address,bytes32,bytes32)",
  "function releasePurchaseFunds(bytes32,uint256)",
  "function recordCollectiblePosition(bytes32,(uint8,bytes32,address,bytes32,uint256,bytes32,bytes32,bytes32,bytes32,uint256,bytes32,bytes32))",
  "function stableAccounting() view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
];

const REGISTRY_ABI = [
  "function collectiblePositionCount() view returns (uint256)",
  "function getPurchaseAuthorization(bytes32) view returns ((bytes32 purchaseKey,uint8 status,uint32 chainEid,bytes32 marketplaceId,bytes32 assetRef,address fundingToken,uint256 maxSpendUsdt6,uint256 releasedUsdt6,address destinationSafe,bytes32 destinationSafeAlt,uint256 approvedAt,bytes32 mandateHash,bytes32 executionRef,bytes32 settlementRef,bytes32 proofHash))",
  "function recordPurchaseExecution(bytes32,bytes32,bytes32,bytes32)",
  "function getCollectiblePosition(uint256) view returns ((uint256 id,bytes32 originPurchaseKey,uint32 chainEid,bytes32 marketplaceId,uint8 custodyMode,bytes32 tokenStandard,address evmCollection,bytes32 nonEvmCollection,uint256 tokenId,bytes32 nonEvmTokenId,bytes32 externalAssetId,bytes32 categoryId,bytes32 marketplaceProvenanceRef,uint256 acquisitionPriceUsdt6,uint256 currentValueUsdt6,uint256 lastNavMarkUsdt6,uint256 acquisitionDate,uint256 lastValuationAt,uint8 status,bytes32 metadataHash,bytes32 proofHash))",
];

function resolvePurchaseFundingMode(deployment) {
  const mode = deployment.purchaseFundingMode || PURCHASE_FUNDING_MODES.Confirm;
  if (!Object.values(PURCHASE_FUNDING_MODES).includes(mode)) {
    throw new Error(`Unsupported purchaseFundingMode: ${mode}`);
  }
  return mode;
}

async function ensureFundingConfirmed(fund, registry, purchaseKey, amountUsdt6, label, purchaseFundingMode) {
  const auth = await registry.getPurchaseAuthorization(purchaseKey);
  const status = Number(auth.status);
  if (status === PURCHASE_STATUS.Approved) {
    if (purchaseFundingMode === PURCHASE_FUNDING_MODES.LegacyRelease) {
      console.log(`Releasing ${amountUsdt6} funding for ${purchaseKey} through legacy V3 path...`);
      await (await fund.releasePurchaseFunds(purchaseKey, amountUsdt6)).wait();
      return;
    }

    console.log(`Confirming ${amountUsdt6} funding for ${purchaseKey}...`);
    await (
      await fund.confirmPurchaseFunding(
        purchaseKey,
        auth.fundingToken,
        amountUsdt6,
        auth.chainEid,
        auth.destinationSafe,
        ethers.id(`${label}-funding-settlement`),
        ethers.id(`${label}-funding-proof`)
      )
    ).wait();
    return;
  }
  if (
    status !== PURCHASE_STATUS.FundsReleased &&
    status !== PURCHASE_STATUS.FundingConfirmed &&
    status !== PURCHASE_STATUS.Executed &&
    status !== PURCHASE_STATUS.PositionRecorded
  ) {
    throw new Error(`Unexpected purchase status for ${purchaseKey}: ${auth.status}`);
  }
}

async function ensureExecution(registry, purchaseKey, label) {
  const auth = await registry.getPurchaseAuthorization(purchaseKey);
  const status = Number(auth.status);
  if (status === PURCHASE_STATUS.FundsReleased || status === PURCHASE_STATUS.FundingConfirmed) {
    console.log(`Recording execution for ${label}...`);
    await (
      await registry.recordPurchaseExecution(
        purchaseKey,
        ethers.id(`${label}-execution`),
        ethers.id(`${label}-settlement`),
        ethers.id(`${label}-proof`)
      )
    ).wait();
    return;
  }
  if (status !== PURCHASE_STATUS.Executed && status !== PURCHASE_STATUS.PositionRecorded) {
    throw new Error(`Unexpected execution status for ${purchaseKey}: ${auth.status}`);
  }
}

async function ensurePosition(fund, registry, purchaseKey, input) {
  const auth = await registry.getPurchaseAuthorization(purchaseKey);
  const status = Number(auth.status);
  if (status === PURCHASE_STATUS.Executed) {
    await (await fund.recordCollectiblePosition(purchaseKey, input)).wait();
    return;
  }
  if (status !== PURCHASE_STATUS.PositionRecorded) {
    throw new Error(`Unexpected position status for ${purchaseKey}: ${auth.status}`);
  }
}

async function main() {
  if (hre.network.name !== "fuji") {
    throw new Error("This script is only intended for Fuji");
  }

  const deploymentKey = process.env.DEPLOYMENT_KEY || "fujiPurchaseTest";
  const deployment = deployments[deploymentKey];
  if (!deployment?.proxy || !deployment?.portfolioRegistry) {
    throw new Error(`Fuji deployment metadata is incomplete for key ${deploymentKey}`);
  }
  const purchaseFundingMode = resolvePurchaseFundingMode(deployment);

  const purchaseAlpha = process.env.PURCHASE_ALPHA_KEY;
  const purchaseBeta = process.env.PURCHASE_BETA_KEY;
  if (!purchaseAlpha || !purchaseBeta) {
    throw new Error("PURCHASE_ALPHA_KEY and PURCHASE_BETA_KEY are required");
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  if (signerAddress.toLowerCase() !== DEPLOYER_EOA.toLowerCase()) {
    throw new Error(`Signer must be the Fuji deployer EOA ${DEPLOYER_EOA}, received ${signerAddress}`);
  }

  const fund = new ethers.Contract(deployment.proxy, FUND_ABI, signer);
  const registry = new ethers.Contract(deployment.portfolioRegistry, REGISTRY_ABI, signer);
  const positionCountBefore = await registry.collectiblePositionCount();
  const resumeTag = process.env.FUJI_PURCHASE_RESUME_TAG || `${Math.floor(Date.now() / 1000)}`;
  console.log(`Using purchase funding mode: ${purchaseFundingMode}`);

  await ensureFundingConfirmed(fund, registry, purchaseAlpha, 20_000_000n, `alpha-${resumeTag}`, purchaseFundingMode);
  await ensureFundingConfirmed(fund, registry, purchaseBeta, 25_000_000n, `beta-${resumeTag}`, purchaseFundingMode);

  const Collection = await ethers.getContractFactory("MockGm10Collection");
  const collectionAlpha = await Collection.deploy("GM10 Resume Slabs Alpha", "GM10RA", `ipfs://gm10-resume-alpha/${resumeTag}/`);
  await collectionAlpha.waitForDeployment();
  const collectionBeta = await Collection.deploy("GM10 Resume Slabs Beta", "GM10RB", `ipfs://gm10-resume-beta/${resumeTag}/`);
  await collectionBeta.waitForDeployment();

  await (await collectionAlpha.mint(signerAddress)).wait();
  await (await collectionBeta.mint(signerAddress)).wait();

  await ensureExecution(registry, purchaseAlpha, `alpha-${resumeTag}`);
  await ensureExecution(registry, purchaseBeta, `beta-${resumeTag}`);

  const alphaPositionId = positionCountBefore + 1n;
  const betaPositionId = positionCountBefore + 2n;

  await ensurePosition(fund, registry, purchaseAlpha, [
    0,
    ethers.id("ERC721"),
    await collectionAlpha.getAddress(),
    ethers.ZeroHash,
    1n,
    ethers.ZeroHash,
    ethers.id(`resume-alpha-collectible-${resumeTag}`),
    ethers.id("pokemon-slab"),
    ethers.id(`resume-alpha-marketplace-provenance-${resumeTag}`),
    18_000_000n,
    ethers.id(`resume-alpha-metadata-${resumeTag}`),
    ethers.id(`resume-alpha-position-proof-${resumeTag}`),
  ]);

  await ensurePosition(fund, registry, purchaseBeta, [
    0,
    ethers.id("ERC721"),
    await collectionBeta.getAddress(),
    ethers.ZeroHash,
    1n,
    ethers.ZeroHash,
    ethers.id(`resume-beta-collectible-${resumeTag}`),
    ethers.id("pokemon-slab"),
    ethers.id(`resume-beta-marketplace-provenance-${resumeTag}`),
    22_000_000n,
    ethers.id(`resume-beta-metadata-${resumeTag}`),
    ethers.id(`resume-beta-position-proof-${resumeTag}`),
  ]);

  const [stableAccounting, position1, position2] = await Promise.all([
    fund.stableAccounting(),
    registry.getCollectiblePosition(alphaPositionId),
    registry.getCollectiblePosition(betaPositionId),
  ]);

  console.log("RESUME_TAG=" + resumeTag);
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

if (process.env.RESUME_PURCHASE_FLOW_FUJI_SKIP_MAIN !== "1") {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  PURCHASE_FUNDING_MODES,
  PURCHASE_STATUS,
  ensureFundingConfirmed,
  resolvePurchaseFundingMode,
};
