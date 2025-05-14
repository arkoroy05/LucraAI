/**
 * Deployment script for LucraWallet contract
 * 
 * This script deploys the LucraWallet contract to the specified network
 * and verifies it on the block explorer.
 * 
 * Usage:
 * ```
 * npx hardhat run scripts/deploy-wallet.js --network base-sepolia
 * ```
 */

const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`Deploying LucraWallet to ${network.name}...`);

  // Configuration
  const guardianDelay = 86400; // 1 day in seconds
  const defaultDailyLimit = ethers.utils.parseEther("1"); // 1 ETH default daily limit

  // Get the contract factory
  const LucraWallet = await ethers.getContractFactory("LucraWallet");

  // Deploy the contract
  const wallet = await LucraWallet.deploy(guardianDelay, defaultDailyLimit);
  await wallet.deployed();

  console.log(`LucraWallet deployed to: ${wallet.address}`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    address: wallet.address,
    guardianDelay,
    defaultDailyLimit: defaultDailyLimit.toString(),
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}-deployment.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved to:", path.join(deploymentsDir, `${network.name}-deployment.json`));

  // Wait for a few block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await wallet.deployTransaction.wait(5);

  // Verify the contract on the block explorer
  if (network.name !== "hardhat" && network.name !== "localhost") {
    try {
      console.log("Verifying contract on block explorer...");
      await run("verify:verify", {
        address: wallet.address,
        constructorArguments: [guardianDelay, defaultDailyLimit],
        contract: "contracts/LucraWallet.sol:LucraWallet",
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
