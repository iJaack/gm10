/**
 * Bridge the Gengar sale proceeds from the Polygon Safe to the Avalanche Safe
 * with Circle CCTP V2. The connected signer must be the 1/1 Polygon Safe owner.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x5cA0... POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com \
 *     npm --prefix contracts exec hardhat -- run scripts/executeGengarSaleCctpBridgePolygon.js --network polygon
 */
const hre = require("hardhat");
const { ethers } = hre;

const POLYGON_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const AVALANCHE_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const POLYGON_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const CCTP_TOKEN_MESSENGER_V2 = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
const DESTINATION_DOMAIN_AVALANCHE = 1;
const STANDARD_FINALITY_THRESHOLD = 2000;
const AMOUNT_USDC = 150_000_000n;
const MAX_FEE = 0n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = ethers.ZeroHash;
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

const TOKEN_MESSENGER_V2_ABI = [
  "function depositForBurn(uint256 amount,uint32 destinationDomain,bytes32 mintRecipient,address burnToken,bytes32 destinationCaller,uint256 maxFee,uint32 minFinalityThreshold) returns (uint64 nonce)",
  "function remoteTokenMessengers(uint32 domain) view returns (bytes32)",
];

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function addressToBytes32(address) {
  return ethers.zeroPadValue(ethers.getAddress(address), 32);
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

  const safe = new ethers.Contract(POLYGON_SAFE, SAFE_ABI, signer);
  const usdc = new ethers.Contract(POLYGON_USDC, ERC20_ABI, signer);
  const messenger = new ethers.Contract(CCTP_TOKEN_MESSENGER_V2, TOKEN_MESSENGER_V2_ABI, signer);

  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  const signerPol = await ethers.provider.getBalance(signerAddress);
  const safeUsdc = await usdc.balanceOf(POLYGON_SAFE);
  const allowance = await usdc.allowance(POLYGON_SAFE, CCTP_TOKEN_MESSENGER_V2);
  const remoteAvalancheMessenger = await messenger.remoteTokenMessengers(DESTINATION_DOMAIN_AVALANCHE);

  console.log("Polygon Safe        :", POLYGON_SAFE);
  console.log("Avalanche recipient :", AVALANCHE_SAFE);
  console.log("Signer              :", signerAddress);
  console.log("Safe owners         :", owners.join(", "));
  console.log("Threshold           :", threshold.toString());
  console.log("Signer POL          :", ethers.formatEther(signerPol));
  console.log("Safe USDC           :", ethers.formatUnits(safeUsdc, 6));
  console.log("Bridge amount       :", ethers.formatUnits(AMOUNT_USDC, 6), "USDC");
  console.log("CCTP messenger      :", CCTP_TOKEN_MESSENGER_V2);
  console.log("Remote AVAX msg     :", remoteAvalancheMessenger);
  console.log("Current allowance   :", ethers.formatUnits(allowance, 6), "USDC");

  if (threshold !== 1n) throw new Error(`Expected 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) throw new Error("Signer is not the Polygon Safe owner");
  if (safeUsdc < AMOUNT_USDC) throw new Error("Polygon Safe has less than 150 USDC");
  if (remoteAvalancheMessenger === ZERO_BYTES32) throw new Error("CCTP V2 has no Avalanche remote messenger configured");

  const hashes = {};
  if (allowance < AMOUNT_USDC) {
    hashes.approveTx = await executeSafeCall({
      safe,
      signerAddress,
      to: POLYGON_USDC,
      data: usdc.interface.encodeFunctionData("approve", [CCTP_TOKEN_MESSENGER_V2, AMOUNT_USDC]),
      label: "Approve Circle CCTP TokenMessengerV2",
    });
  } else {
    console.log("Approve Circle CCTP TokenMessengerV2: skipped; allowance is sufficient");
  }

  hashes.burnTx = await executeSafeCall({
    safe,
    signerAddress,
    to: CCTP_TOKEN_MESSENGER_V2,
    data: messenger.interface.encodeFunctionData("depositForBurn", [
      AMOUNT_USDC,
      DESTINATION_DOMAIN_AVALANCHE,
      addressToBytes32(AVALANCHE_SAFE),
      POLYGON_USDC,
      ZERO_BYTES32,
      MAX_FEE,
      STANDARD_FINALITY_THRESHOLD,
    ]),
    label: "Burn Polygon USDC for Avalanche CCTP mint",
  });

  console.log(JSON.stringify({
    amountUsdcRaw: AMOUNT_USDC.toString(),
    amountUsdc: ethers.formatUnits(AMOUNT_USDC, 6),
    destinationDomain: DESTINATION_DOMAIN_AVALANCHE,
    minFinalityThreshold: STANDARD_FINALITY_THRESHOLD,
    maxFee: MAX_FEE.toString(),
    recipient: AVALANCHE_SAFE,
    ...hashes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
