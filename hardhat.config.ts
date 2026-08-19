// ═══════════════════════════════════════════════════════════
// Hardhat config — for compiling and deploying ClaimContract
// ═══════════════════════════════════════════════════════════

import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';

export default {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: './contracts/evm',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    'base-sepolia': {
      url: 'https://sepolia.base.org',
      accounts: [DEPLOYER_KEY],
    },
    sepolia: {
      url: process.env.ETH_RPC_1 || 'https://sepolia.infura.io/v3/',
      accounts: [DEPLOYER_KEY],
    },
    'bsc-testnet': {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: [DEPLOYER_KEY],
    },
    'arbitrum-sepolia': {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [DEPLOYER_KEY],
    },
    'polygon-amoy': {
      url: 'https://rpc-amoy.polygon.technology',
      accounts: [DEPLOYER_KEY],
    },
  },
};
