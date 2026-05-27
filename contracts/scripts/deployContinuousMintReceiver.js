const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

const MANAGER_ROLE = ethers.id("MANAGER_ROLE");

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];
  if (value === undefined || value === "") return undefined;
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function parseDecimals(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 18) throw new Error(`${name} must be an integer from 0 to 18`);
  return parsed;
}

function loadDeployments() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) return {};
  return JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentKey = process.env.DEPLOYMENT_KEY || (hre.network.name === "fuji" ? "fuji" : "avalanche");
  const deployment = loadDeployments()[deploymentKey] || {};
  const fundProxy = optionalAddress("FUND_PROXY_ADDRESS") || ethers.getAddress(deployment.proxy);
  const treasury = requireAddress("TREASURY_SAFE_ADDRESS");
  const admin = optionalAddress("RECEIVER_ADMIN") || treasury;
  const settlementToken = optionalAddress("SETTLEMENT_TOKEN_ADDRESS") || ethers.getAddress(deployment.settlementToken);
  const settlementTokenDecimals = parseDecimals("SETTLEMENT_TOKEN_DECIMALS", Number(deployment.settlementTokenDecimals || 6));
  const grantManagerRole = process.env.GRANT_MANAGER_ROLE === "true";

  console.log("Deploying Gm10ContinuousMintReceiver");
  console.log("  Network          :", hre.network.name);
  console.log("  Deployer         :", await deployer.getAddress());
  console.log("  Fund proxy       :", fundProxy);
  console.log("  Treasury         :", treasury);
  console.log("  Receiver admin   :", admin);
  console.log("  Settlement token :", settlementToken, `(${settlementTokenDecimals} decimals)`);

  const Receiver = await ethers.getContractFactory("Gm10ContinuousMintReceiver");
  const receiver = await Receiver.deploy(
    fundProxy,
    treasury,
    admin,
    settlementToken,
    settlementTokenDecimals
  );
  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();

  console.log("  Receiver         :", receiverAddress);
  console.log("  Frontend env     :", `VITE_GM10_CONTINUOUS_COMMIT_RECEIVER_ADDRESS=${receiverAddress}`);

  const fund = await ethers.getContractAt([
    "function grantRole(bytes32 role,address account)",
    "function hasRole(bytes32 role,address account) view returns (bool)",
  ], fundProxy, deployer);

  if (grantManagerRole) {
    const tx = await fund.grantRole(MANAGER_ROLE, receiverAddress);
    console.log("  grantRole tx     :", tx.hash);
    await tx.wait();
    console.log("  Manager role     :", await fund.hasRole(MANAGER_ROLE, receiverAddress));
  } else {
    const grantData = fund.interface.encodeFunctionData("grantRole", [MANAGER_ROLE, receiverAddress]);
    console.log("  Manager role     :", await fund.hasRole(MANAGER_ROLE, receiverAddress));
    console.log("  Grant calldata   :", grantData);
    console.log("  Set GRANT_MANAGER_ROLE=true only when the connected signer can grant MANAGER_ROLE directly.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
