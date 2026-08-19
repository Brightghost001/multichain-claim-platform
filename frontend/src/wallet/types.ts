// ═══════════════════════════════════════════════════════════
// Unified Wallet Types — all chains speak the same interface
// ═══════════════════════════════════════════════════════════

export type ChainType = 'evm' | 'solana' | 'tron' | 'xrpl';
export type ChainId = 'ethereum' | 'bsc' | 'base' | 'arbitrum' | 'polygon' | 'avalanche' | 'optimism' | 'solana' | 'tron' | 'xrpl';

export interface WalletAccount {
  address: string;
  chain: ChainId;
  chainType: ChainType;
  provider: string;        // 'metamask' | 'phantom' | 'tronlink' | etc
  connected: boolean;
  connectedAt: number;
}

export interface WalletAdapter {
  id: string;               // unique adapter id
  name: string;             // display name
  chainType: ChainType;
  chains: ChainId[];
  isAvailable: () => boolean;
  connect: () => Promise<WalletAccount>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<string>;
  onAccountsChanged?: (callback: (accounts: string[]) => void) => void;
  onChainChanged?: (callback: (chainId: string) => void) => void;
}

export interface ChainConfig {
  id: ChainId;
  name: string;
  type: ChainType;
  chainId?: number;         // EVM chain id
  currency: string;
  rpcUrl: string;
  explorerUrl: string;
  icon: string;
  testnet: boolean;
}

// ── Chain Registry ──
export const CHAIN_REGISTRY: Record<ChainId, ChainConfig> = {
  ethereum:   { id: 'ethereum',   name: 'Ethereum',   type: 'evm',     chainId: 1,      currency: 'ETH',  rpcUrl: process.env.ETH_RPC_1 || '',    explorerUrl: 'https://etherscan.io',      icon: '🔷', testnet: false },
  bsc:        { id: 'bsc',        name: 'BNB Chain',  type: 'evm',     chainId: 56,     currency: 'BNB',  rpcUrl: process.env.BSC_RPC_1 || '',     explorerUrl: 'https://bscscan.com',        icon: '🟡', testnet: false },
  base:       { id: 'base',       name: 'Base',       type: 'evm',     chainId: 8453,   currency: 'ETH',  rpcUrl: process.env.BASE_RPC_1 || '',    explorerUrl: 'https://basescan.org',       icon: '🔵', testnet: false },
  arbitrum:   { id: 'arbitrum',   name: 'Arbitrum',   type: 'evm',     chainId: 42161,  currency: 'ETH',  rpcUrl: process.env.ARBITRUM_RPC_1 || '', explorerUrl: 'https://arbiscan.io',       icon: '🟦', testnet: false },
  polygon:    { id: 'polygon',    name: 'Polygon',    type: 'evm',     chainId: 137,    currency: 'MATIC', rpcUrl: process.env.POLYGON_RPC_1 || '', explorerUrl: 'https://polygonscan.com',   icon: '🟣', testnet: false },
  avalanche:  { id: 'avalanche',  name: 'Avalanche',  type: 'evm',     chainId: 43114,  currency: 'AVAX', rpcUrl: process.env.AVALANCHE_RPC_1 || '', explorerUrl: 'https://snowtrace.io',      icon: '🔺', testnet: false },
  optimism:   { id: 'optimism',   name: 'Optimism',   type: 'evm',     chainId: 10,     currency: 'ETH',  rpcUrl: process.env.OPTIMISM_RPC_1 || '',  explorerUrl: 'https://optimistic.etherscan.io', icon: '🔴', testnet: false },
  solana:     { id: 'solana',     name: 'Solana',     type: 'solana',                   currency: 'SOL',  rpcUrl: process.env.SOLANA_RPC_1 || '',  explorerUrl: 'https://solscan.io',         icon: '🟢', testnet: false },
  tron:       { id: 'tron',       name: 'Tron',       type: 'tron',                     currency: 'TRX',  rpcUrl: 'https://api.trongrid.io',        explorerUrl: 'https://tronscan.org',       icon: '🟠', testnet: false },
  xrpl:       { id: 'xrpl',       name: 'XRP Ledger', type: 'xrpl',                    currency: 'XRP',  rpcUrl: 'https://xrplcluster.com',        explorerUrl: 'https://livenet.xrpl.org',   icon: '⚫', testnet: false },
};

// ── Campaign types ──
export interface Campaign {
  id: string;
  name: string;
  tokenName: string;
  tokenSymbol: string;
  chain: ChainId;
  claimContractAddress?: string;
  merkleRoot?: string;
  startTime: number;
  endTime: number;
  status: 'draft' | 'active' | 'paused' | 'ended';
  totalAllocation: string;
  totalClaimed: string;
  totalEligible: number;
  description?: string;
  logoUrl?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  amount?: string;
  reason?: string;
  hasClaimed: boolean;
  merkleProof?: string[];
  campaign?: Campaign;
}

export interface ClaimResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  error?: string;
}
