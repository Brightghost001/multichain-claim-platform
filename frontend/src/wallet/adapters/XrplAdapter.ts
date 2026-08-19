// ═══════════════════════════════════════════════════════════
// XRP Ledger Adapter — Gem Wallet, Xumm
// ═══════════════════════════════════════════════════════════

import type { WalletAdapter, WalletAccount, ChainId, ChainType } from '../types';

export class XrplAdapter implements WalletAdapter {
  id = 'xrpl-gem';
  name = 'Gem Wallet';
  chainType: ChainType = 'xrpl';
  chains: ChainId[] = ['xrpl'];
  private provider: any;

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).gem || (window as any).xrpl);
  }

  async connect(): Promise<WalletAccount> {
    const gem = (window as any).gem;
    if (!gem) throw new Error('Gem Wallet not found');
    this.provider = gem;

    const account = await gem.request({ method: 'connect' });
    const address = account.address || account.account;

    return {
      address,
      chain: 'xrpl',
      chainType: 'xrpl',
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
    const result = await this.provider.request({
      method: 'signTransaction',
      tx: { TransactionType: 'SignIn', SigningPubKey: '' },
    });
    return result.txId || result.hash || 'signed';
  }

  async getBalance(): Promise<string> {
    if (!this.provider) throw new Error('Not connected');
    const info = await this.provider.request({
      method: 'accountInfo',
      account: this.provider.defaultAccount,
    });
    return ((info.account_data?.Balance || 0) / 1e6).toString();
  }
}
