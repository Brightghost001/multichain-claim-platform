// ═══════════════════════════════════════════════════════════
// EVM Adapter — handles MetaMask, Coinbase, Trust, WalletConnect
// One adapter for all EVM chains since they share the same model
// ═══════════════════════════════════════════════════════════

import type { WalletAdapter, WalletAccount, ChainId, ChainType } from '../types';
import { CHAIN_REGISTRY } from '../types';

export class EvmAdapter implements WalletAdapter {
  id: string;
  name: string;
  chainType: ChainType = 'evm';
  chains: ChainId[] = ['ethereum', 'bsc', 'base', 'arbitrum', 'polygon', 'avalanche', 'optimism'];
  private provider: any;
  private walletKey: string;

  constructor(walletKey: string, name: string) {
    this.walletKey = walletKey;
    this.id = `evm-${walletKey}`;
    this.name = name;
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const eth = (window as any).ethereum;
    if (!eth) return false;
    if (this.walletKey === 'walletconnect') return true;
    return Boolean(eth[this.walletKey] || (this.walletKey === 'metamask' && eth.isMetaMask));
  }

  async connect(): Promise<WalletAccount> {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('No EVM provider found');

    if (eth.providers?.length) {
      this.provider = eth.providers.find((p: any) =>
        this.walletKey === 'metamask' ? p.isMetaMask :
        this.walletKey === 'coinbase' ? p.isCoinbaseWallet :
        this.walletKey === 'trust' ? p.isTrust : false
      ) || eth.providers[0];
    } else {
      this.provider = eth;
    }

    const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
    const chainIdHex = await this.provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    const chain = this.mapChainId(chainId);

    return {
      address: accounts[0],
      chain,
      chainType: 'evm',
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
    const accounts = await this.provider.request({ method: 'eth_accounts' });
    const sig = await this.provider.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    });
    return sig;
  }

  async getBalance(): Promise<string> {
    if (!this.provider) throw new Error('Not connected');
    const accounts = await this.provider.request({ method: 'eth_accounts' });
    const balance = await this.provider.request({
      method: 'eth_getBalance',
      params: [accounts[0], 'latest'],
    });
    return (parseInt(balance, 16) / 1e18).toString();
  }

  async switchChain(chain: ChainId): Promise<void> {
    const config = CHAIN_REGISTRY[chain];
    if (!config.chainId) throw new Error(`${chain} has no EVM chainId`);

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${config.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${config.chainId.toString(16)}`,
            chainName: config.name,
            nativeCurrency: { name: config.currency, symbol: config.currency, decimals: 18 },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.explorerUrl],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.provider) this.provider.on('accountsChanged', callback);
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (this.provider) this.provider.on('chainChanged', callback);
  }

  private mapChainId(chainId: number): ChainId {
    const map: Record<number, ChainId> = {
      1: 'ethereum', 56: 'bsc', 8453: 'base',
      42161: 'arbitrum', 137: 'polygon',
      43114: 'avalanche', 10: 'optimism',
    };
    return map[chainId] || 'ethereum';
  }
}

export function createEvmAdapters(): EvmAdapter[] {
  return [
    new EvmAdapter('metamask', 'MetaMask'),
    new EvmAdapter('coinbase', 'Coinbase Wallet'),
    new EvmAdapter('trust', 'Trust Wallet'),
  ];
}
