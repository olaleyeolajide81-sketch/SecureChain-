const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SecureChain contract...");

  // Get the contract factory
  const SecureChain = await ethers.getContractFactory("SecureChain");
  
  // Deploy the contract
  const secureChain = await SecureChain.deploy();
  
  // Wait for deployment to complete
  await secureChain.deployed();
  
  console.log("SecureChain deployed to:", secureChain.address);
  console.log("Transaction hash:", secureChain.deployTransaction.hash);
  
  // Fund the contract with some ETH for verification rewards
  const fundAmount = ethers.utils.parseEther("1.0"); // 1 ETH
  const fundTx = await secureChain.fundContract({ value: fundAmount });
  await fundTx.wait();
  
  console.log("Contract funded with 1 ETH for verification rewards");
  console.log("Funding transaction hash:", fundTx.hash);
  
  // Save deployment information
  const deploymentInfo = {
    contractAddress: secureChain.address,
    deploymentHash: secureChain.deployTransaction.hash,
    fundingHash: fundTx.hash,
    network: network.name,
    deployedAt: new Date().toISOString()
  };
  
  // Write deployment info to a file
  const fs = require("fs");
  fs.writeFileSync(
    `deployment-${network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`Deployment info saved to deployment-${network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
