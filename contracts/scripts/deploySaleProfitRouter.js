/**
 * Deploy the stateless sale-profit router used by GemMintStrategyFundV8
 * architecture-aware sale finalization.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... npx hardhat run scripts/deploySaleProfitRouter.js --network avalanche
 *
 * Optional:
 *   DEPLOYMENT_KEY=avalanche
 */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

function loadDeployments() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) return { deploymentsPath, deployments: {} };
  return {
    deploymentsPath,
    deployments: JSON.parse(fs.readFileSync(deploymentsPath, "utf8")),
  };
}

function saveDeployments(deploymentsPath, deployments) {
  fs.writeFileSync(deploymentsPath, `${JSON.stringify(deployments, null, 2)}\n`);
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || {};

  if (deployment.saleProfitRouter && ethers.isAddress(deployment.saleProfitRouter)) {
    console.log("Sale-profit router already recorded:", deployment.saleProfitRouter);
    return;
  }

  const signerAddress = await signer.getAddress();
  console.log("Deploying Gm10SaleProfitRouter");
  console.log("  Network:", network);
  console.log("  Signer :", signerAddress);

  const Router = await ethers.getContractFactory("Gm10SaleProfitRouter", signer);
  const router = await Router.deploy();
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  const tx = router.deploymentTransaction();

  console.log("  Router :", routerAddress);
  console.log("  Tx     :", tx ? tx.hash : "unknown");

  deployments[deploymentKey] = {
    ...deployment,
    saleProfitRouter: routerAddress,
    lastSaleProfitRouterDeployment: {
      router: routerAddress,
      tx: tx ? tx.hash : "",
      timestamp: new Date().toISOString(),
    },
  };
  saveDeployments(deploymentsPath, deployments);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
