/**
 * Receive the Gengar sale CCTP V2 message on Avalanche after Circle attests it.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x5cA0... CCTP_BURN_TX=0x... \
 *     npm --prefix contracts exec hardhat -- run scripts/receiveGengarSaleCctpAvalanche.js --network avalanche
 */
const hre = require("hardhat");
const { ethers } = hre;

const SOURCE_DOMAIN_POLYGON = 7;
const AVALANCHE_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const CCTP_MESSAGE_TRANSMITTER_V2 = "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64";
const IRIS_BASE_URL = "https://iris-api.circle.com/v2/messages";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

const MESSAGE_TRANSMITTER_V2_ABI = [
  "function receiveMessage(bytes message,bytes attestation) returns (bool success)",
];

function requireTxHash(name) {
  const value = process.env[name];
  if (!/^0x[0-9a-fA-F]{64}$/.test(value || "")) throw new Error(`${name} must be a transaction hash`);
  return value;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAttestedMessage(burnTx) {
  const url = `${IRIS_BASE_URL}/${SOURCE_DOMAIN_POLYGON}?transactionHash=${burnTx}`;
  const maxAttempts = Number(process.env.CCTP_ATTESTATION_ATTEMPTS || "120");
  const intervalMs = Number(process.env.CCTP_ATTESTATION_INTERVAL_MS || "30000");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    const message = payload?.messages?.find((entry) => entry?.message && entry?.attestation);
    const status = message?.status || payload?.messages?.[0]?.status || payload?.error || response.status;
    console.log(`Circle attestation attempt ${attempt}/${maxAttempts}: ${status}`);

    if (message?.attestation && message.attestation !== "PENDING") {
      return message;
    }

    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  throw new Error("Circle attestation was not ready before the polling limit");
}

async function main() {
  const burnTx = requireTxHash("CCTP_BURN_TX");
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS.");
  const signerAddress = await signer.getAddress();

  const usdc = new ethers.Contract(AVALANCHE_USDC, ERC20_ABI, ethers.provider);
  const transmitter = new ethers.Contract(CCTP_MESSAGE_TRANSMITTER_V2, MESSAGE_TRANSMITTER_V2_ABI, signer);
  const beforeBalance = await usdc.balanceOf(AVALANCHE_SAFE);

  console.log("CCTP burn tx        :", burnTx);
  console.log("Signer             :", signerAddress);
  console.log("Message transmitter:", CCTP_MESSAGE_TRANSMITTER_V2);
  console.log("Avalanche Safe USDC before:", ethers.formatUnits(beforeBalance, 6));

  const message = await fetchAttestedMessage(burnTx);
  console.log("Circle message hash :", message.messageHash || "(not provided)");
  console.log("Circle finality     :", message.finalityThresholdExecuted ?? message.finalityThreshold ?? "(not provided)");

  const tx = await transmitter.receiveMessage(message.message, message.attestation);
  console.log("CCTP receive submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("CCTP receive confirmed in block:", receipt.blockNumber);

  const afterBalance = await usdc.balanceOf(AVALANCHE_SAFE);
  console.log("Avalanche Safe USDC after :", ethers.formatUnits(afterBalance, 6));
  console.log("Received delta USDC       :", ethers.formatUnits(afterBalance - beforeBalance, 6));
  console.log(JSON.stringify({
    burnTx,
    receiveTx: tx.hash,
    receivedRaw: (afterBalance - beforeBalance).toString(),
    safeBalanceRaw: afterBalance.toString(),
    messageHash: message.messageHash || "",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
