// ═══════════════════════════════════════════════════════════
// EVM Blockchain Monitor — listens for Claimed events (Mongoose)
// ═══════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { Claim, Eligibility, Campaign } from '../../database/models';

const CLAIM_ABI = [
  'event Claimed(address indexed user, uint256 amount, bytes32 indexed campaignId)',
];

export class EvmMonitor {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(rpcConfig: Record<string, string[]>) {
    for (const [chain, rpcs] of Object.entries(rpcConfig)) {
      if (rpcs[0]) {
        const provider = new ethers.JsonRpcProvider(rpcs[0]);
        this.providers.set(chain, provider);
      }
    }
  }

  watchClaimContract(chain: string, contractAddress: string, campaignId: string) {
    const provider = this.providers.get(chain);
    if (!provider) throw new Error(`No provider for chain ${chain}`);

    const contract = new ethers.Contract(contractAddress, CLAIM_ABI, provider);

    contract.on('Claimed', async (user: string, amount: bigint, evtCampaignId: string, event: any) => {
      console.log(`[Monitor] Claimed: ${user} claimed ${amount} on ${chain}, tx: ${event.log.transactionHash}`);

      await Claim.updateOne(
        { campaignId, walletAddress: user.toLowerCase(), txHash: event.log.transactionHash },
        { status: 'confirmed', confirmedAt: new Date() }
      );

      await Eligibility.updateOne(
        { campaignId, walletAddress: user.toLowerCase() },
        { claimed: true, claimedAt: new Date(), txHash: event.log.transactionHash }
      );

      await Campaign.updateOne(
        { id: campaignId },
        { $inc: { totalClaimed: amount.toString() } }
      );
    });

    console.log(`[Monitor] Watching ${contractAddress} on ${chain} for campaign ${campaignId}`);
  }

  stop(chain: string, _contractAddress: string) {
    const provider = this.providers.get(chain);
    if (!provider) return;
    provider.removeAllListeners();
    console.log(`[Monitor] Stopped watching on ${chain}`);
  }
}
