const hre = require("hardhat");
const { ethers } = hre;

const PURCHASE_STATUS = {
  None: 0,
  Approved: 1,
  FundsReleased: 2,
  FundingConfirmed: 3,
  Executed: 4,
  PositionRecorded: 5,
  Cancelled: 6,
};

const LEGACY_PURCHASE_STATUS = {
  None: 0,
  Approved: 1,
  FundsReleased: 2,
  Executed: 3,
  PositionRecorded: 4,
  Cancelled: 5,
};

const PURCHASE_FUNDING_MODES = {
  Confirm: "confirmPurchaseFunding",
  LegacyRelease: "legacyRelease",
};

function resolvePurchaseFundingMode(deployment) {
  const mode = deployment.purchaseFundingMode || PURCHASE_FUNDING_MODES.Confirm;
  if (!Object.values(PURCHASE_FUNDING_MODES).includes(mode)) {
    throw new Error(`Unsupported purchaseFundingMode: ${mode}`);
  }
  return mode;
}

function normalizePurchaseStatus(status, purchaseFundingMode) {
  const value = Number(status);
  if (purchaseFundingMode !== PURCHASE_FUNDING_MODES.LegacyRelease) {
    return value;
  }

  switch (value) {
    case LEGACY_PURCHASE_STATUS.None:
      return PURCHASE_STATUS.None;
    case LEGACY_PURCHASE_STATUS.Approved:
      return PURCHASE_STATUS.Approved;
    case LEGACY_PURCHASE_STATUS.FundsReleased:
      return PURCHASE_STATUS.FundsReleased;
    case LEGACY_PURCHASE_STATUS.Executed:
      return PURCHASE_STATUS.Executed;
    case LEGACY_PURCHASE_STATUS.PositionRecorded:
      return PURCHASE_STATUS.PositionRecorded;
    case LEGACY_PURCHASE_STATUS.Cancelled:
      return PURCHASE_STATUS.Cancelled;
    default:
      return value;
  }
}

async function ensureFundingConfirmed(fund, registry, purchaseKey, amountUsdt6, label, purchaseFundingMode) {
  const auth = await registry.getPurchaseAuthorization(purchaseKey);
  const status = normalizePurchaseStatus(auth.status, purchaseFundingMode);
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

module.exports = {
  LEGACY_PURCHASE_STATUS,
  PURCHASE_FUNDING_MODES,
  PURCHASE_STATUS,
  ensureFundingConfirmed,
  normalizePurchaseStatus,
  resolvePurchaseFundingMode,
};
