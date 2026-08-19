// ═══════════════════════════════════════════════════════════
// Hardhat deploy script — deploys ClaimContract
// Usage: npx hardhat run scripts/deploy.ts --network base-sepolia
// ═══════════════════════════════════════════════════════════

import { ethers } from 'hardhat';

async function main() {
  const tokenAddress = process.env.CLAIM_TOKEN_ADDRESS;
  const merkleRoot = process.env.CLAIM_MERKLE_ROOT;
  const deadline = process.env.CLAIM_DEADLINE;

  if (!tokenAddress || !merkleRoot || !deadline) {
    console.error('Set CLAIM_TOKEN_ADDRESS, CLAIM_MERKLE_ROOT, CLAIM_DEADLINE in .env');
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const ClaimContract = await ethers.getContractFactory('ClaimContract');
  const contract = await ClaimContract.deploy(tokenAddress, merkleRoot, deadline);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ ClaimContract deployed to: ${address}`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  console.log(`   Deadline: ${deadline}`);
  console.log(`\nUpdate your campaign's claim_contract field with: ${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
