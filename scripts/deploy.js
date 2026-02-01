const { ethers } = require("hardhat");

async function main() {
  console.log("🦎 Deploying MoodMintNFT...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy with deployer as both owner and initial relayer
  const MoodMintNFT = await ethers.getContractFactory("MoodMintNFT");
  const contract = await MoodMintNFT.deploy(
    deployer.address,  // owner
    deployer.address   // relayer (can update later)
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ MoodMintNFT deployed to:", address);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network <network> ${address} ${deployer.address} ${deployer.address}`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: network.config.chainId
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/${network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n📄 Deployment info saved to deployments/${network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
