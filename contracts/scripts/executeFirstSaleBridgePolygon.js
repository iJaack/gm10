/**
 * Execute the first-card-sale proceeds bridge from the Polygon Safe to the
 * Avalanche Safe. The connected signer must be the 1/1 Safe owner.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x5cA0... npx hardhat run scripts/executeFirstSaleBridgePolygon.js --network polygon
 */
const hre = require("hardhat");
const { ethers } = hre;

const POLYGON_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const AVALANCHE_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const POLYGON_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const AMOUNT_USDC = 1_900_000_000n;
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

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
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

async function fetchLiFiQuote() {
  const params = new URLSearchParams({
    fromChain: "137",
    toChain: "43114",
    fromToken: POLYGON_USDC,
    toToken: AVALANCHE_USDC,
    fromAmount: AMOUNT_USDC.toString(),
    fromAddress: POLYGON_SAFE,
    toAddress: AVALANCHE_SAFE,
    slippage: "0.003",
    integrator: "gm10-admin",
    order: "CHEAPEST",
  });
  const response = await fetch(`https://li.quest/v1/quote?${params}`, {
    headers: {
      accept: "application/json",
      "user-agent": "gm10-admin",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `LI.FI quote failed with ${response.status}`);
  }
  if (!payload?.transactionRequest?.to || !payload?.transactionRequest?.data || !payload?.estimate?.approvalAddress) {
    throw new Error("LI.FI quote did not include executable transaction data and approval address");
  }
  return payload;
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS.");
  const signerAddress = await signer.getAddress();

  const safe = new ethers.Contract(POLYGON_SAFE, SAFE_ABI, signer);
  const usdc = new ethers.Contract(POLYGON_USDC, ERC20_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  const signerPol = await ethers.provider.getBalance(signerAddress);
  const safeUsdc = await usdc.balanceOf(POLYGON_SAFE);

  console.log("Polygon Safe :", POLYGON_SAFE);
  console.log("Signer       :", signerAddress);
  console.log("Safe owners  :", owners.join(", "));
  console.log("Threshold    :", threshold.toString());
  console.log("Signer POL   :", ethers.formatEther(signerPol));
  console.log("Safe USDC    :", ethers.formatUnits(safeUsdc, 6));

  if (threshold !== 1n) throw new Error(`Expected 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) throw new Error("Signer is not the Polygon Safe owner");
  if (safeUsdc < AMOUNT_USDC) throw new Error("Polygon Safe has less than 1,900 USDC");

  const quote = await fetchLiFiQuote();
  const approvalAddress = ethers.getAddress(quote.estimate.approvalAddress);
  const txRequest = quote.transactionRequest;
  const allowance = await usdc.allowance(POLYGON_SAFE, approvalAddress);

  console.log("LI.FI route   :", quote.estimate?.tool || "unknown");
  console.log("Approval addr :", approvalAddress);
  console.log("Expected out  :", ethers.formatUnits(BigInt(quote.estimate?.toAmount || "0"), 6), "USDC");
  console.log("Min out       :", ethers.formatUnits(BigInt(quote.estimate?.toAmountMin || "0"), 6), "USDC");
  console.log("Current allow :", ethers.formatUnits(allowance, 6), "USDC");

  const hashes = {};
  if (allowance < AMOUNT_USDC) {
    const approveData = usdc.interface.encodeFunctionData("approve", [approvalAddress, AMOUNT_USDC]);
    hashes.approveTx = await executeSafeCall({
      safe,
      signerAddress,
      to: POLYGON_USDC,
      data: approveData,
      label: "Approve LI.FI spender",
    });
  } else {
    console.log("Approve LI.FI spender: skipped; allowance is sufficient");
  }

  hashes.bridgeTx = await executeSafeCall({
    safe,
    signerAddress,
    to: ethers.getAddress(txRequest.to),
    data: txRequest.data,
    value: BigInt(txRequest.value || "0"),
    label: "Bridge Polygon USDC to Avalanche Safe",
  });

  console.log("Bridge submitted. Track with:");
  console.log(`  Source tx: ${hashes.bridgeTx}`);
  console.log(`  LI.FI id : ${quote.id}`);
  console.log(JSON.stringify({
    quoteId: quote.id,
    tool: quote.estimate?.tool || "",
    expectedToAmount: quote.estimate?.toAmount || "",
    minToAmount: quote.estimate?.toAmountMin || "",
    approvalAddress,
    ...hashes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
