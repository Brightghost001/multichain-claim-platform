// ═══════════════════════════════════════════════════════════
// Claim Processor Worker — polls pending claims and confirms
// Also monitors blockchain for Claimed events
// ═══════════════════════════════════════════════════════════

import { query } from '../database/client';
import { EvmMonitor } from '../blockchain/evm/monitor';

const POLL_INTERVAL = 15000; // 15 seconds

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

    // Load all active campaigns with claim contracts and start monitoring
    try {
      const res = await query(
        `SELECT id, chain, claim_contract FROM campaigns WHERE status = 'active' AND claim_contract IS NOT NULL`
      );
      for (const row of res.rows) {
        if (row.claim_contract) {
          this.monitor.watchClaimContract(row.chain, row.claim_contract, row.id);
        }
      }
    } catch (e) {
      console.error('[Worker] Failed to load campaigns:', (e as Error).message);
    }

    // Start polling loop
    this.poll();
  }

  stop() {
    this.running = false;
    console.log('[Worker] Claim processor stopped');
  }

  private async poll() {
    while (this.running) {
      try {
        // Find pending claims older than 30 seconds
        const pending = await query(
          `SELECT * FROM claims WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 seconds' LIMIT 50`
        );

        for (const claim of pending.rows) {
          // Check if the transaction is confirmed on-chain
          // In production: verify tx receipt via RPC provider
          // For now: mark as confirmed after a timeout as a fallback
          const age = Date.now() - new Date(claim.created_at).getTime();
          if (age > 120000) { // 2 min timeout
            await query(
              `UPDATE claims SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
              [claim.id]
            );
            console.log(`[Worker] Claim ${claim.id} auto-confirmed (timeout)`);
          }
        }
      } catch (e) {
        console.error('[Worker] Poll error:', (e as Error).message);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}
