const { expect } = require("chai");
const { ethers } = require("hardhat");

process.env.RESUME_PURCHASE_FLOW_FUJI_SKIP_MAIN = "1";
const {
  PURCHASE_FUNDING_MODES,
  ensureFundingConfirmed,
  resolvePurchaseFundingMode,
} = require("../scripts/resumePurchaseFlowFuji");
delete process.env.RESUME_PURCHASE_FLOW_FUJI_SKIP_MAIN;

describe("resumePurchaseFlowFuji funding compatibility", function () {
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

  it("rejects unknown funding modes", function () {
    expect(() => resolvePurchaseFundingMode({ purchaseFundingMode: "releasePurchaseFunds" }))
      .to.throw("Unsupported purchaseFundingMode");
  });
});
