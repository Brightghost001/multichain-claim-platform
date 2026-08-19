// ═══════════════════════════════════════════════════════════
// WalletManager — unified wallet connection layer
// The frontend never cares which wallet or chain is used.
// It just gets a WalletAccount back.
// ═══════════════════════════════════════════════════════════

import type { WalletAdapter, WalletAccount, ChainId } from './types';

class WalletManagerClass {
  private adapters: Map<string, WalletAdapter> = new Map();
  private activeAccount: WalletAccount | null = null;
  private listeners: Set<(account: WalletAccount | null) => void> = new Set();

  // ── Adapter registration (plugins) ──
  registerAdapter(adapter: WalletAdapter) {
    this.adapters.set(adapter.id, adapter);
    console.log(`[WalletManager] Registered adapter: ${adapter.name} (${adapter.id})`);
  }

  getAdapters(): WalletAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAvailableAdapters(): WalletAdapter[] {
    return this.getAdapters().filter(a => a.isAvailable());
  }

  getAdaptersForChain(chain: ChainId): WalletAdapter[] {
    return this.getAvailableAdapters().filter(a => a.chains.includes(chain));
  }

  // ── Connection ──
  async connect(adapterId: string): Promise<WalletAccount> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error(`Adapter "${adapterId}" not found`);
    if (!adapter.isAvailable()) throw new Error(`Adapter "${adapter.name}" not available`);

    const account = await adapter.connect();
    this.activeAccount = account;
    this.notifyListeners();
    return account;
  }

  async disconnect(): Promise<void> {
    if (this.activeAccount) {
      const adapter = this.adapters.get(this.activeAccount.provider);
      if (adapter) await adapter.disconnect();
    }
    this.activeAccount = null;
    this.notifyListeners();
  }

  getActiveAccount(): WalletAccount | null {
    return this.activeAccount;
  }

  // ── Subscription ──
  subscribe(callback: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.activeAccount);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.activeAccount));
  }

  // ── Signing (for eligibility verification) ──
  async signMessage(message: string): Promise<string> {
    if (!this.activeAccount) throw new Error('No wallet connected');
    const adapter = this.adapters.get(this.activeAccount.provider);
    if (!adapter) throw new Error('Adapter not found');
    return adapter.signMessage(message);
  }
}

export const WalletManager = new WalletManagerClass();
