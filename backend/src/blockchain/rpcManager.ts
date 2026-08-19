// ═══════════════════════════════════════════════════════════
// RPC Manager — multi-provider failover for each chain
// If Provider A fails, falls back to B, then C
// ═══════════════════════════════════════════════════════════

import { ethers } from 'ethers';

interface RpcConfig {
  [chain: string]: string[]; // chain → array of RPC URLs
}

export class RpcManager {
  private chains: RpcConfig = {};
  private activeIndex: Map<string, number> = new Map(); // chain → current RPC index

  constructor(config: RpcConfig) {
    this.chains = config;
    for (const chain of Object.keys(config)) {
      this.activeIndex.set(chain, 0);
    }
  }

  // ── Get the active provider for a chain ──
  getProvider(chain: string): ethers.JsonRpcProvider {
    const rpcs = this.chains[chain];
    if (!rpcs || rpcs.length === 0) throw new Error(`No RPCs configured for ${chain}`);

    const idx = this.activeIndex.get(chain) || 0;
    return new ethers.JsonRpcProvider(rpcs[idx]);
  }

  // ── Try a request with failover ──
  async withFailover<T>(chain: string, fn: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
    const rpcs = this.chains[chain];
    if (!rpcs) throw new Error(`No RPCs for ${chain}`);

    let lastError: Error | null = null;

    for (let i = 0; i < rpcs.length; i++) {
      const idx = (this.activeIndex.get(chain) || 0 + i) % rpcs.length;
      const provider = new ethers.JsonRpcProvider(rpcs[idx]);

      try {
        const result = await fn(provider);
        // Success — update active index
        this.activeIndex.set(chain, idx);
        return result;
      } catch (err) {
        console.warn(`[RPC] ${chain} provider ${idx} failed:`, (err as Error).message);
        lastError = err as Error;
      }
    }

    throw lastError || new Error(`All RPCs failed for ${chain}`);
  }

  // ── Health check all providers ──
  async healthCheck(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const results: Record<string, { healthy: boolean; latency: number }> = {};

    for (const [chain, rpcs] of Object.entries(this.chains)) {
      const provider = new ethers.JsonRpcProvider(rpcs[this.activeIndex.get(chain) || 0]);
      const start = Date.now();
      try {
        await provider.getBlockNumber();
        results[chain] = { healthy: true, latency: Date.now() - start };
      } catch {
        results[chain] = { healthy: false, latency: -1 };
      }
    }

    return results;
  }
}
