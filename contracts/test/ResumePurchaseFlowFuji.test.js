const { expect } = require("chai");
const { ethers } = require("hardhat");

const {
  LEGACY_PURCHASE_STATUS,
  PURCHASE_FUNDING_MODES,
  PURCHASE_STATUS,
  ensureFundingConfirmed,
  normalizePurchaseStatus,
  resolvePurchaseFundingMode,
} = require("../scripts/lib/purchaseFundingMode");

process.env.RESUME_PURCHASE_FLOW_FUJI_SKIP_MAIN = "1";
const {
  ensureExecution,
  ensurePosition,
} = require("../scripts/resumePurchaseFlowFuji");
delete process.env.RESUME_PURCHASE_FLOW_FUJI_SKIP_MAIN;

describe("Fuji script purchase funding compatibility", function () {
  const purchaseKey = ethers.id("resume-funding-compatibility");
  const amountUsdt6 = 20_000_000n;
  const fundingToken = "0x0000000000000000000000000000000000000001";
  const destinationSafe = "0x0000000000000000000000000000000000000002";
  const chainEid = 43113;

  function registryWithApprovedPurchase() {
    return {
      getPurchaseAuthorization: async () => ({
        status: 1,
        fundingToken,
        chainEid,
        destinationSafe,
      }),
    };
  }

  it("uses legacy releasePurchaseFunds for V3 fujiPurchaseTest metadata", async function () {
    const calls = [];
    const fund = {
      releasePurchaseFunds: async (...args) => {
        calls.push(["releasePurchaseFunds", args]);
        return { wait: async () => undefined };
      },
      confirmPurchaseFunding: async () => {
        throw new Error("confirmPurchaseFunding should not be called");
      },
    };

    await ensureFundingConfirmed(
      fund,
      registryWithApprovedPurchase(),
      purchaseKey,
      amountUsdt6,
      "alpha-test",
      resolvePurchaseFundingMode({ purchaseFundingMode: PURCHASE_FUNDING_MODES.LegacyRelease })
    );

    expect(calls).to.deep.equal([
      ["releasePurchaseFunds", [purchaseKey, amountUsdt6]],
    ]);
  });

  it("uses confirmPurchaseFunding for V8 metadata", async function () {
    const calls = [];
    const fund = {
      releasePurchaseFunds: async () => {
        throw new Error("releasePurchaseFunds should not be called");
      },
      confirmPurchaseFunding: async (...args) => {
        calls.push(["confirmPurchaseFunding", args]);
        return { wait: async () => undefined };
      },
    };

    await ensureFundingConfirmed(
      fund,
      registryWithApprovedPurchase(),
      purchaseKey,
      amountUsdt6,
      "alpha-test",
      resolvePurchaseFundingMode({ purchaseFundingMode: PURCHASE_FUNDING_MODES.Confirm })
    );

    expect(calls).to.deep.equal([
      [
        "confirmPurchaseFunding",
        [
          purchaseKey,
          fundingToken,
          amountUsdt6,
          chainEid,
          destinationSafe,
          ethers.id("alpha-test-funding-settlement"),
          ethers.id("alpha-test-funding-proof"),
        ],
      ],
    ]);
  });

  it("defaults new deployments to the V8 confirm path", function () {
    expect(resolvePurchaseFundingMode({})).to.equal(PURCHASE_FUNDING_MODES.Confirm);
  });

  it("normalizes legacy executed and position-recorded status ordinals", function () {
    expect(normalizePurchaseStatus(
      LEGACY_PURCHASE_STATUS.Executed,
      PURCHASE_FUNDING_MODES.LegacyRelease
    )).to.equal(PURCHASE_STATUS.Executed);
    expect(normalizePurchaseStatus(
      LEGACY_PURCHASE_STATUS.PositionRecorded,
      PURCHASE_FUNDING_MODES.LegacyRelease
    )).to.equal(PURCHASE_STATUS.PositionRecorded);
  });

  it("keeps V2 status ordinals unchanged for confirm funding mode", function () {
    expect(normalizePurchaseStatus(
      PURCHASE_STATUS.FundingConfirmed,
      PURCHASE_FUNDING_MODES.Confirm
    )).to.equal(PURCHASE_STATUS.FundingConfirmed);
    expect(normalizePurchaseStatus(
      PURCHASE_STATUS.Executed,
      PURCHASE_FUNDING_MODES.Confirm
    )).to.equal(PURCHASE_STATUS.Executed);
  });

  it("does not replay execution for a legacy already-executed purchase", async function () {
    const registry = {
      getPurchaseAuthorization: async () => ({ status: LEGACY_PURCHASE_STATUS.Executed }),
      recordPurchaseExecution: async () => {
        throw new Error("recordPurchaseExecution should not be called");
      },
    };

    await ensureExecution(
      registry,
      purchaseKey,
      "alpha-test",
      PURCHASE_FUNDING_MODES.LegacyRelease
    );
  });

  it("does not replay position recording for a legacy already-recorded purchase", async function () {
    const fund = {
      recordCollectiblePosition: async () => {
        throw new Error("recordCollectiblePosition should not be called");
      },
    };
    const registry = {
      getPurchaseAuthorization: async () => ({ status: LEGACY_PURCHASE_STATUS.PositionRecorded }),
    };

    await ensurePosition(
      fund,
      registry,
      purchaseKey,
      [],
      PURCHASE_FUNDING_MODES.LegacyRelease
    );
  });

  it("rejects unknown funding modes", function () {
    expect(() => resolvePurchaseFundingMode({ purchaseFundingMode: "releasePurchaseFunds" }))
      .to.throw("Unsupported purchaseFundingMode");
  });
});
