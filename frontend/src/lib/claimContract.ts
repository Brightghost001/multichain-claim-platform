// ═══════════════════════════════════════════════════════════
// Claim Contract Client — viem-based contract interaction
// Handles the on-chain claim transaction from the frontend
// ═══════════════════════════════════════════════════════════

import { createPublicClient, createWalletClient, custom, parseAbi, encodeFunctionData } from 'viem';
import { mainnet, base, arbitrum, polygon, bsc, avalanche, optimism } from 'viem/chains';
import type { ChainId, EligibilityResult } from '../wallet/types';

// ── Chain mapping for viem ──
const VIEM_CHAINS: Record<string, any> = {
  ethereum: mainnet,
  bsc,
  base,
  arbitrum,
  polygon,
  avalanche,
  optimism,
};

// ── Claim contract ABI (minimal) ──
const CLAIM_ABI = parseAbi([
  'function claim(uint256 amount, bytes32[] calldata merkleProof, bytes32 campaignId) external',
  'function hasClaimed(address) view returns (bool)',
  'function merkleRoot() view returns (bytes32)',
  'function claimDeadline() view returns (uint256)',
  'function paused() view returns (bool)',
  'event Claimed(address indexed user, uint256 amount, bytes32 indexed campaignId)',
]);

export interface ClaimTxParams {
  contractAddress: string;
  chain: ChainId;
  amount: string;
  merkleProof: string[];
  campaignId: string;
  walletProvider: any; // EIP-1193 provider
  walletAddress: string;
}

export async function submitClaimTx(params: ClaimTxParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const { contractAddress, chain, amount, merkleProof, campaignId, walletProvider, walletAddress } = params;

  const viemChain = VIEM_CHAINS[chain];
  if (!viemChain) return { success: false, error: `Chain ${chain} not supported for on-chain claims` };

  try {
    // ── Public client (read) ──
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: custom(walletProvider),
    });

    // ── Wallet client (write) ──
    const walletClient = createWalletClient({
      chain: viemChain,
      transport: custom(walletProvider),
    });

    // ── Pre-flight checks ──
    // 1. Is contract paused?
    const isPaused = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'paused',
    }) as boolean;
    if (isPaused) return { success: false, error: 'Claim contract is paused' };

    // 2. Already claimed?
    const alreadyClaimed = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'hasClaimed',
      args: [walletAddress],
    }) as boolean;
    if (alreadyClaimed) return { success: false, error: 'Already claimed' };

    // 3. Deadline passed?
    const deadline = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'claimDeadline',
    }) as bigint;
    const currentBlock = await publicClient.getBlock();
    if (currentBlock.timestamp > deadline) {
      return { success: false, error: 'Claim period has ended' };
    }

    // ── Submit claim transaction ──
    // Convert campaignId string to bytes32
    const campaignIdBytes32 = stringToBytes32(campaignId);
    // Convert proof strings to bytes32
    const proofBytes32 = merkleProof.map(p => p as `0x${string}`);

    const { request } = await publicClient.simulateContract({
      account: walletAddress as `0x${string}`,
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'claim',
      args: [BigInt(amount), proofBytes32, campaignIdBytes32],
    });

    const txHash = await walletClient.writeContract(request);

    // ── Wait for confirmation ──
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'success') {
      return { success: true, txHash: txHash };
    } else {
      return { success: false, error: 'Transaction reverted', txHash: txHash };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Transaction failed' };
  }
}

// ── Helper: string to bytes32 ──
function stringToBytes32(str: string): `0x${string}` {
  // If it's already a hex string starting with 0x, pad it
  if (str.startsWith('0x')) {
    return str.padEnd(66, '0').slice(0, 66) as `0x${string}`;
  }
  // Otherwise hash the string
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  // Use a simple hex encoding — pad to 32 bytes
  const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex.padEnd(64, '0').slice(0, 64)}` as `0x${string}`;
}

// ── Read-only: check claim status on-chain ──
export async function checkClaimStatus(
  contractAddress: string,
  chain: ChainId,
  walletAddress: string,
  walletProvider: any
): Promise<{ claimed: boolean; paused: boolean; deadline: bigint }> {
  const viemChain = VIEM_CHAINS[chain];
  if (!viemChain) throw new Error(`Chain ${chain} not supported`);

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: custom(walletProvider),
  });

  const [claimed, paused, deadline] = await Promise.all([
    publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'hasClaimed',
      args: [walletAddress],
    }),
    publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'paused',
    }),
    publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: CLAIM_ABI,
      functionName: 'claimDeadline',
    }),
  ]);

  return {
    claimed: claimed as boolean,
    paused: paused as boolean,
    deadline: deadline as bigint,
  };
}
