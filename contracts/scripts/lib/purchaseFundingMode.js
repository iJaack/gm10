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

module.exports = {
  PURCHASE_FUNDING_MODES,
  PURCHASE_STATUS,
  ensureFundingConfirmed,
  resolvePurchaseFundingMode,
};
