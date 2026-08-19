import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WalletManager } from '../wallet/WalletManager';
import { createEvmAdapters } from '../wallet/adapters/EvmAdapter';
import { createSolanaAdapters } from '../wallet/adapters/SolanaAdapter';
import { TronAdapter } from '../wallet/adapters/TronAdapter';
import { XrplAdapter } from '../wallet/adapters/XrplAdapter';
import { useEffect, useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Register all wallet adapters (plugins)
    for (const a of createEvmAdapters()) WalletManager.registerAdapter(a);
    for (const a of createSolanaAdapters()) WalletManager.registerAdapter(a);
    WalletManager.registerAdapter(new TronAdapter());
    WalletManager.registerAdapter(new XrplAdapter());
    setReady(true);
  }, []);

  if (!ready) return null;
  return <Component {...pageProps} />;
}
