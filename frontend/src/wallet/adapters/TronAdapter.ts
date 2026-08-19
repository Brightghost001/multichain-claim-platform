// ═══════════════════════════════════════════════════════════
// Tron Adapter — TronLink
// ═══════════════════════════════════════════════════════════

import type { WalletAdapter, WalletAccount, ChainId, ChainType } from '../types';

export class TronAdapter implements WalletAdapter {
  id = 'tron-tronlink';
  name = 'TronLink';
  chainType: ChainType = 'tron';
  chains: ChainId[] = ['tron'];
  private provider: any;

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).tronLink?.tronWeb || (window as any).tronWeb);
  }

  async connect(): Promise<WalletAccount> {
    const tronWeb = (window as any).tronLink?.tronWeb || (window as any).tronWeb;
    if (!tronWeb) throw new Error('TronLink not found');

    // TronLink may need to request authorization
    if (tronWeb.request) {
      try { await tronWeb.request({ method: 'tron_requestAccounts' }); } catch {}
    }

    const address = tronWeb.defaultAddress?.base58 || tronWeb.defaultAddress?.hex;
    if (!address) throw new Error('No Tron address found');
    this.provider = tronWeb;

    return {
      address,
      chain: 'tron',
      chainType: 'tron',
      provider: this.id,
      connected: true,
      connectedAt: Date.now(),
    };
  }

  async disconnect(): Promise<void> {
    this.provider = null;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('Not connected');
    const signed = await this.provider.trx.sign(message);
    return signed;
  }

  async getBalance(): Promise<string> {
    if (!this.provider) throw new Error('Not connected');
    const balance = await this.provider.trx.getBalance(this.provider.defaultAddress.base58);
    return (balance / 1e6).toString();
  }
}
