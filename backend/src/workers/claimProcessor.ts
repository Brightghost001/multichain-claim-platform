// ═══════════════════════════════════════════════════════════
// Claim Processor Worker — polls pending claims (Mongoose)
// ═══════════════════════════════════════════════════════════

import { Claim, Campaign, Eligibility } from '../database/models';
import { EvmMonitor } from '../blockchain/evm/monitor';

const POLL_INTERVAL = 15000;

const RPC_CONFIG: Record<string, string[]> = {
  ethereum:  [process.env.ETH_RPC_1 || '', process.env.ETH_RPC_2 || ''],
  bsc:      [process.env.BSC_RPC_1 || '', process.env.BSC_RPC_2 || ''],
  base:     [process.env.BASE_RPC_1 || '', process.env.BASE_RPC_2 || ''],
  arbitrum: [process.env.ARBITRUM_RPC_1 || ''],
  polygon:  [process.env.POLYGON_RPC_1 || ''],
  avalanche: [process.env.AVALANCHE_RPC_1 || ''],
  optimism:  [process.env.OPTIMISM_RPC_1 || ''],
};

export class ClaimProcessor {
  private monitor: EvmMonitor;
  private running = false;

  constructor() {
    this.monitor = new EvmMonitor(RPC_CONFIG);
  }

  async start() {
    this.running = true;
    console.log('[Worker] Claim processor started');

    // Load active campaigns with claim contracts and start monitoring
    try {
      const campaigns = await Campaign.find({ status: 'active', claimContract: { $ne: null } }).lean();
      for (const c of campaigns) {
        if (c.claimContract) {
          this.monitor.watchClaimContract(c.chain, c.claimContract, c.id);
        }
      }
    } catch (e) {
      console.error('[Worker] Failed to load campaigns:', (e as Error).message);
    }

    this.poll();
  }

  stop() {
    this.running = false;
    console.log('[Worker] Claim processor stopped');
  }

  private async poll() {
    while (this.running) {
      try {
        const cutoff = new Date(Date.now() - 30_000);
        const pending = await Claim.find({ status: 'pending', createdAt: { $lt: cutoff } }).limit(50).lean();

        for (const claim of pending) {
          const age = Date.now() - new Date(claim.createdAt).getTime();
          if (age > 120_000) {
            await Claim.updateOne({ _id: claim._id }, { status: 'confirmed', confirmedAt: new Date() });
            console.log(`[Worker] Claim ${claim._id} auto-confirmed (timeout)`);
          }
        }
      } catch (e) {
        console.error('[Worker] Poll error:', (e as Error).message);
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}
