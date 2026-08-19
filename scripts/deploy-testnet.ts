#!/usr/bin/env ts-node
// ═══════════════════════════════════════════════════════════
// Deploy ClaimContract to a testnet
// Usage: npx ts-node scripts/deploy-testnet.ts --chain base-sepolia --token 0x... --root 0x... --deadline 1800000000
// ═══════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// ── Parse args ──
const args = process.argv.slice(2);
function getArg(key: string): string | undefined {
  const idx = args.indexOf(`--${key}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const chainName = getArg('chain') || 'base-sepolia';
const tokenAddress = getArg('token');
const merkleRoot = getArg('root');
const deadline = getArg('deadline');
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!tokenAddress || !merkleRoot || !deadline) {
  console.error('Usage: npx ts-node scripts/deploy-testnet.ts --chain base-sepolia --token 0x... --root 0x... --deadline 1800000000');
  process.exit(1);
}

if (!privateKey) {
  console.error('Set DEPLOYER_PRIVATE_KEY in .env');
  process.exit(1);
}

// ── Testnet RPC config ──
const TESTNET_RPCS: Record<string, string> = {
  'base-sepolia': 'https://sepolia.base.org',
  'sepolia': 'https://sepolia.infura.io/v3/',
  'bsc-testnet': 'https://data-seed-prebsc-1-s1.binance.org:8545',
  'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc',
  'polygon-amoy': 'https://rpc-amoy.polygon.technology',
};

const rpcUrl = TESTNET_RPCS[chainName];
if (!rpcUrl) {
  console.error(`Unknown testnet: ${chainName}. Supported: ${Object.keys(TESTNET_RPCS).join(', ')}`);
  process.exit(1);
}

// ── Contract bytecode (simplified — use compiled output from Hardhat/Foundry) ──
// In production, compile with: solcjs contracts/evm/ClaimContract.sol --bin
// Or use Hardhat/Foundry to get the bytecode
// For now, this is a placeholder showing the deployment structure
async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying ClaimContract to ${chainName}...`);
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Token: ${tokenAddress}`);
  console.log(`Merkle Root: ${merkleRoot}`);
  console.log(`Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < 0.001) {
    console.error('Insufficient balance for deployment. Fund your wallet at a faucet.');
    process.exit(1);
  }

  // ── Deploy ──
  // NOTE: Replace with actual compiled bytecode from your build step
  // const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  // const contract = await factory.deploy(tokenAddress, merkleRoot, deadline);
  // await contract.waitForDeployment();
  // const address = await contract.getAddress();
  // console.log(`✅ ClaimContract deployed to: ${address}`);

  console.log('\nTo deploy:');
  console.log('1. Compile: npx hardhat compile');
  console.log('2. Run: npx hardhat run scripts/deploy.ts --network base-sepolia');
  console.log('3. Update the campaign\'s claim_contract field with the deployed address');
}

main().catch(console.error);
