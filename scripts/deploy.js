const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("ChainWarranty Local Deployment & Synchronization");
  console.log("----------------------------------------------------");

  // 1. Get network information & deployer signer
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Deploying network: ${hre.network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer address:  ${deployer.address}`);

  // 2. Deploy ChainWarranty
  const ChainWarrantyFactory = await hre.ethers.getContractFactory("ChainWarranty");
  const chainWarranty = await ChainWarrantyFactory.deploy();
  await chainWarranty.waitForDeployment();

  const deployedAddress = await chainWarranty.getAddress();
  console.log(`ChainWarranty deployed to: ${deployedAddress}`);
  console.log(`Contract owner set to:     ${await chainWarranty.owner()}`);
  console.log("Note: Zero arbitrary sellers pre-authorized. Seller authorization strictly controlled by owner.");

  // 3. Read exact compiled artifact for ABI (never handwritten)
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ChainWarranty.sol",
    "ChainWarranty.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}. Please run 'npx hardhat compile' first.`
    );
  }

  const artifactRaw = fs.readFileSync(artifactPath, "utf-8");
  const artifact = JSON.parse(artifactRaw);

  // 4. Construct frontend configuration object
  const frontendConfig = {
    contractName: "ChainWarranty",
    networkName: hre.network.name,
    chainId: chainId,
    address: deployedAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // 5. Ensure target frontend directory exists
  const targetDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFilePath = path.join(targetDir, "contractConfig.json");
  fs.writeFileSync(targetFilePath, JSON.stringify(frontendConfig, null, 2), "utf-8");

  console.log(`Successfully exported contract configuration to:`);
  console.log(`  ${targetFilePath}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
