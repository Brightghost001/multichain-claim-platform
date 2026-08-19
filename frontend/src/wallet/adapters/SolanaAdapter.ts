// ═══════════════════════════════════════════════════════════
// Solana Adapter — Phantom, Solflare, Backpack
// ═══════════════════════════════════════════════════════════

import type { WalletAdapter, WalletAccount, ChainId, ChainType } from '../types';

export class SolanaAdapter implements WalletAdapter {
  id: string;
  name: string;
  chainType: ChainType = 'solana';
  chains: ChainId[] = ['solana'];
  private provider: any;
  private walletKey: string;

  constructor(walletKey: string, name: string) {
    this.walletKey = walletKey;
    this.id = `solana-${walletKey}`;
    this.name = name;
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.walletKey === 'phantom') return Boolean((window as any).phantom?.solana);
    if (this.walletKey === 'solflare') return Boolean((window as any).solflare);
    if (this.walletKey === 'backpack') return Boolean((window as any).backpack);
    return false;
  }

  async connect(): Promise<WalletAccount> {
    let provider: any;

    if (this.walletKey === 'phantom') {
      provider = (window as any).phantom?.solona;
      if (!provider) provider = (window as any).phantom?.solana;
    } else if (this.walletKey === 'solflare') {
      provider = (window as any).solflare;
    } else if (this.walletKey === 'backpack') {
      provider = (window as any).backpack;
    }

    if (!provider) throw new Error(`${this.name} not found`);
    this.provider = provider;

    const resp = await provider.connect();
    const address = resp.publicKey?.toString() || resp.publicKey;

    return {
      address,
      chain: 'solana',
      chainType: 'solana',
      provider: this.id,
      connected: true,
      connectedAt: Date.now(),
    };
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      try { await this.provider.disconnect(); } catch {}
    }
    this.provider = null;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider) throw new Error('Not connected');
    const encoded = new TextEncoder().encode(message);
    const signed = await this.provider.signMessage(encoded, 'utf8');
    // Return base64 of signature
    return btoa(String.fromCharCode(...signed.signature));
  }

  async getBalance(): Promise<string> {
    // Balance fetched via backend RPC call
    return '0';
  }
}

export function createSolanaAdapters(): SolanaAdapter[] {
  return [
    new SolanaAdapter('phantom', 'Phantom'),
    new SolanaAdapter('solflare', 'Solflare'),
    new SolanaAdapter('backpack', 'Backpack'),
  ];
}
