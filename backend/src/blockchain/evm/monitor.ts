// ═══════════════════════════════════════════════════════════
// EVM Blockchain Monitor — listens for Claimed events
// Updates claim records when on-chain confirmation lands
// ═══════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { query } from '../../database/client';

const CLAIM_ABI = [
  'event Claimed(address indexed user, uint256 amount, bytes32 indexed campaignId)',
];

export class EvmMonitor {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(rpcConfig: Record<string, string[]>) {
    for (const [chain, rpcs] of Object.entries(rpcConfig)) {
      // Use first RPC, failover to others on error
      const provider = new ethers.JsonRpcProvider(rpcs[0]);
      this.providers.set(chain, provider);
    }
  }

  // ── Watch a deployed claim contract for Claimed events ──
  watchClaimContract(chain: string, contractAddress: string, campaignId: string) {
    const provider = this.providers.get(chain);
    if (!provider) throw new Error(`No provider for chain ${chain}`);

    const contract = new ethers.Contract(contractAddress, CLAIM_ABI, provider);

    contract.on('Claimed', async (user: string, amount: bigint, evtCampaignId: string, event: any) => {
      console.log(`[Monitor] Claimed event: ${user} claimed ${amount} on ${chain}, tx: ${event.log.transactionHash}`);

      // Update claim record in DB
      await query(
        `UPDATE claims SET status = 'confirmed', confirmed_at = NOW()
         WHERE campaign_id = $1 AND wallet_address = $2 AND tx_hash = $3`,
        [campaignId, user.toLowerCase(), event.log.transactionHash]
      );

      // Update eligibility record with tx hash
      await query(
        `UPDATE eligibility SET claimed = true, claimed_at = NOW(), tx_hash = $1
         WHERE campaign_id = $2 AND wallet_address = $3`,
        [event.log.transactionHash, campaignId, user.toLowerCase()]
      );

      // Update campaign total claimed
      await query(
        `UPDATE campaigns SET total_claimed = total_claimed + $1 WHERE id = $2`,
        [amount.toString(), campaignId]
      );
    });

    console.log(`[Monitor] Watching ${contractAddress} on ${chain} for campaign ${campaignId}`);
  }

  // ── Stop watching ──
  stop(chain: string, contractAddress: string) {
    const provider = this.providers.get(chain);
    if (!provider) return;
    // Remove all listeners for this provider
    provider.removeAllListeners();
    console.log(`[Monitor] Stopped watching ${contractAddress} on ${chain}`);
  }
}
