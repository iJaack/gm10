/**
 * Record, settle, and architecture-finalize the Gengar sale after CCTP has
 * minted exact USDC to the Avalanche Safe. The connected signer must be the
 * 1/1 Avalanche Safe owner.
 *
 * Required env:
 *   LEDGER_ADDRESS=0x5cA0...
 *   SETTLED_USDC_RAW=150000000
 *   CCTP_RECEIVE_TX=0x...
 *   SALE_PROFIT_ROUTER_ADDRESS=0x...
 *
 * Optional market snapshot env:
 *   SPOT_PREMIUM_BPS=0
 *   LP_COVERAGE_BPS=1000
 *   PROTOCOL_LP_COVERAGE_BPS=1000
 *   SLIPPAGE_DEPTH_SCORE_BPS=5000
 *   LIQUID_TREASURY_RATIO_BPS=1000
 *   SALE_ROI_BPS=<derived from settled amount if omitted>
 *   MARKET_SNAPSHOT_PROOF_HASH=0x...
 *   PULL_SETTLEMENT_FROM_SAFE=true
 */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

const SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const PORTFOLIO_REGISTRY = "0x0fCbce2341E3682AB92f1cAabDF976E17D91436A";
const FUND_PROXY = "0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const POLYGON_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const SALE_TX = "0x71f546e311d3196c0babe3dd76754c23710f298938b8953d6017cfd704e71c3a";
const SALE_KEY_LABEL = "courtyard-sale-1-71f546e3";
const GROSS_USDC_RAW = 150_000_000n;
const COST_BASIS_USDC_RAW = 96_000_000n;
const POSITION_ID = 1n;
const SOURCE_CHAIN_EID_POLYGON = 30109;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const OPERATION_CALL = 0;

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const REGISTRY_ABI = [
  "function authorizeSale(bytes32 saleKey,uint256 positionId,bytes32 marketplaceId,uint256 minNetProceedsUsdt6,bytes32 mandateHash)",
  "function recordSaleExecution(bytes32 saleKey,uint256 grossProceedsUsdt6,uint256 marketplaceFeesUsdt6,uint256 bridgeFeesUsdt6,bytes32 executionRef,bytes32 proceedsRef,bytes32 proofHash)",
  "function recordExternalSaleProceeds(bytes32 saleKey,uint32 sourceChainEid,address sourceToken,uint256 sourceTokenAmount,uint8 sourceTokenDecimals,bytes32 sourceProceedsRef,bytes32 proofHash)",
  "function getSaleAuthorization(bytes32 saleKey) view returns (tuple(bytes32 saleKey,uint8 status,uint256 positionId,uint32 chainEid,bytes32 marketplaceId,uint256 minNetProceedsUsdt6,uint256 grossProceedsUsdt6,uint256 marketplaceFeesUsdt6,uint256 bridgeFeesUsdt6,uint256 netProceedsUsdt6,uint32 sourceChainEid,address sourceToken,uint256 sourceTokenAmount,uint8 sourceTokenDecimals,address proceedsToken,uint256 proceedsAmount,uint256 approvedAt,bytes32 mandateHash,bytes32 executionRef,bytes32 proceedsRef,bytes32 sourceProceedsRef,bytes32 proofHash))",
];

const FUND_ABI = [
  "function confirmStableSaleProceeds(bytes32 saleKey,address proceedsToken,uint256 amount,bool pullFromCaller,bytes32 proceedsRef,bytes32 proofHash)",
  "function finalizeSaleWithMarketSnapshot(bytes32 saleKey,address saleRouter,tuple(int256 spotPremiumBps,uint256 lpCoverageBps,uint256 protocolLpCoverageBps,uint256 slippageDepthScoreBps,uint256 liquidTreasuryRatioBps,uint256 saleRoiBps,bytes32 proofHash,uint64 observedAt) snapshot)",
];

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function requireBytes32(name, fallback) {
  const value = process.env[name] || fallback;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value || "")) throw new Error(`${name} must be bytes32`);
  return value;
}

function requireUint(name) {
  const value = process.env[name];
  if (!/^\d+$/.test(String(value || ""))) throw new Error(`${name} must be an integer string`);
  return BigInt(value);
}

function intEnv(name, fallback) {
  return BigInt(process.env[name] || fallback);
}

function uintEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be uint`);
  return BigInt(value);
}

function boolEnv(name, fallback) {
  const value = String(process.env[name] || fallback).toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function canonicalSaleRouterAddress() {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const router = deployments?.avalanche?.saleProfitRouter;
  if (!router || !ethers.isAddress(router)) {
    throw new Error("deployments.json is missing avalanche.saleProfitRouter");
  }
  return ethers.getAddress(router);
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

async function executeSafeCall({ safe, signerAddress, to, data, value = 0n, label }) {
  const nonce = await safe.nonce();
  console.log(`${label}: Safe nonce ${nonce.toString()}`);
  const tx = await safe.execTransaction(
    to,
    value,
    data,
    OPERATION_CALL,
    0,
    0,
    0,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    prevalidatedSignature(signerAddress)
  );
  console.log(`${label}: submitted ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`${label}: confirmed in block ${receipt.blockNumber}`);
  return tx.hash;
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS.");
  const signerAddress = await signer.getAddress();
  const settledRaw = requireUint("SETTLED_USDC_RAW");
  const cctpReceiveTx = requireBytes32("CCTP_RECEIVE_TX");
  const saleRouter = requireAddress("SALE_PROFIT_ROUTER_ADDRESS");
  const canonicalSaleRouter = canonicalSaleRouterAddress();
  if (!sameAddress(saleRouter, canonicalSaleRouter)) {
    throw new Error(`SALE_PROFIT_ROUTER_ADDRESS must match deployments.json avalanche.saleProfitRouter (${canonicalSaleRouter})`);
  }
  if (settledRaw === 0n || settledRaw > GROSS_USDC_RAW) throw new Error("Invalid settled USDC amount");

  const saleKey = ethers.id(SALE_KEY_LABEL);
  const marketplaceId = ethers.id("COURTYARD");
  const bridgeFeesRaw = GROSS_USDC_RAW - settledRaw;
  const defaultSaleRoiBps = settledRaw > COST_BASIS_USDC_RAW
    ? ((settledRaw - COST_BASIS_USDC_RAW) * 10_000n) / COST_BASIS_USDC_RAW
    : 0n;
  const pullSettlementFromSafe = boolEnv("PULL_SETTLEMENT_FROM_SAFE", "true");
  const snapshotProof = requireBytes32("MARKET_SNAPSHOT_PROOF_HASH", ethers.id(`gengar-sale-market-snapshot:${cctpReceiveTx}`));
  const latestBlock = await ethers.provider.getBlock("latest");
  const snapshot = {
    spotPremiumBps: intEnv("SPOT_PREMIUM_BPS", "0"),
    lpCoverageBps: uintEnv("LP_COVERAGE_BPS", "1000"),
    protocolLpCoverageBps: uintEnv("PROTOCOL_LP_COVERAGE_BPS", "1000"),
    slippageDepthScoreBps: uintEnv("SLIPPAGE_DEPTH_SCORE_BPS", "5000"),
    liquidTreasuryRatioBps: uintEnv("LIQUID_TREASURY_RATIO_BPS", "1000"),
    saleRoiBps: uintEnv("SALE_ROI_BPS", defaultSaleRoiBps.toString()),
    proofHash: snapshotProof,
    observedAt: latestBlock.timestamp,
  };

  const safe = new ethers.Contract(SAFE, SAFE_ABI, signer);
  const usdc = new ethers.Contract(AVALANCHE_USDC, ERC20_ABI, signer);
  const registry = new ethers.Contract(PORTFOLIO_REGISTRY, REGISTRY_ABI, signer);
  const fund = new ethers.Contract(FUND_PROXY, FUND_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  const safeUsdc = await usdc.balanceOf(SAFE);

  console.log("Avalanche Safe :", SAFE);
  console.log("Signer         :", signerAddress);
  console.log("Safe owners    :", owners.join(", "));
  console.log("Threshold      :", threshold.toString());
  console.log("Safe USDC      :", ethers.formatUnits(safeUsdc, 6));
  console.log("Settled USDC   :", ethers.formatUnits(settledRaw, 6));
  console.log("Bridge fees    :", ethers.formatUnits(bridgeFeesRaw, 6));
  console.log("Sale key label :", SALE_KEY_LABEL);
  console.log("Sale key       :", saleKey);
  console.log("Sale router    :", saleRouter);
  console.log("Pull proceeds  :", pullSettlementFromSafe ? "yes" : "no, confirm pre-funded balance");

  if (threshold !== 1n) throw new Error(`Expected 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) throw new Error("Signer is not the Avalanche Safe owner");
  if (safeUsdc < settledRaw) throw new Error("Avalanche Safe has less USDC than SETTLED_USDC_RAW");

  const sale = await registry.getSaleAuthorization(saleKey);
  if (Number(sale.status) !== 0) {
    throw new Error(`Expected sale status None before this script, got ${sale.status.toString()}`);
  }

  await executeSafeCall({
    safe,
    signerAddress,
    to: PORTFOLIO_REGISTRY,
    data: registry.interface.encodeFunctionData("authorizeSale", [
      saleKey,
      POSITION_ID,
      marketplaceId,
      settledRaw,
      SALE_TX,
    ]),
    label: "Authorize sale",
  });

  await executeSafeCall({
    safe,
    signerAddress,
    to: PORTFOLIO_REGISTRY,
    data: registry.interface.encodeFunctionData("recordSaleExecution", [
      saleKey,
      GROSS_USDC_RAW,
      0n,
      bridgeFeesRaw,
      SALE_TX,
      cctpReceiveTx,
      cctpReceiveTx,
    ]),
    label: "Record sale execution",
  });

  await executeSafeCall({
    safe,
    signerAddress,
    to: PORTFOLIO_REGISTRY,
    data: registry.interface.encodeFunctionData("recordExternalSaleProceeds", [
      saleKey,
      SOURCE_CHAIN_EID_POLYGON,
      POLYGON_USDC,
      GROSS_USDC_RAW,
      6,
      SALE_TX,
      SALE_TX,
    ]),
    label: "Record external Polygon proceeds",
  });

  if (pullSettlementFromSafe) {
    const allowance = await usdc.allowance(SAFE, FUND_PROXY);
    if (allowance < settledRaw) {
      await executeSafeCall({
        safe,
        signerAddress,
        to: AVALANCHE_USDC,
        data: usdc.interface.encodeFunctionData("approve", [FUND_PROXY, settledRaw]),
        label: "Approve fund to pull settled USDC",
      });
    } else {
      console.log("Approve fund to pull settled USDC: skipped; allowance is sufficient");
    }
  }

  await executeSafeCall({
    safe,
    signerAddress,
    to: FUND_PROXY,
    data: fund.interface.encodeFunctionData("confirmStableSaleProceeds", [
      saleKey,
      AVALANCHE_USDC,
      settledRaw,
      pullSettlementFromSafe,
      cctpReceiveTx,
      cctpReceiveTx,
    ]),
    label: "Confirm settled sale proceeds",
  });

  await executeSafeCall({
    safe,
    signerAddress,
    to: FUND_PROXY,
    data: fund.interface.encodeFunctionData("finalizeSaleWithMarketSnapshot", [
      saleKey,
      saleRouter,
      snapshot,
    ]),
    label: "Finalize sale with market snapshot",
  });

  console.log("Gengar sale finalized through architecture-aware route.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
