// ═══════════════════════════════════════════════════════════
// Landing page — Hero → Connect Wallet → Select Campaign → Claim
// Now wired to viem contract calls via useClaim hook
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { WalletManager } from '../wallet/WalletManager';
import { apiClient, type CampaignDto } from '../lib/apiClient';
import { useClaim } from '../hooks/useClaim';
import type { WalletAccount } from '../wallet/types';

export default function Home() {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDto | null>(null);

  const { state, eligibility, txHash, error, checkEligibility, submitClaim, reset } = useClaim();

  useEffect(() => {
    const unsub = WalletManager.subscribe(setAccount);
    return unsub;
  }, []);

  useEffect(() => {
    apiClient.getCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  useEffect(() => {
    if (account && selectedCampaign) {
      reset();
      checkEligibility(selectedCampaign);
    }
  }, [account, selectedCampaign]);

  const handleConnect = async (adapterId: string) => {
    try { await WalletManager.connect(adapterId); }
    catch (e: any) { alert(e.message); }
  };

  const availableAdapters = WalletManager.getAvailableAdapters();

  return (
    <div className="page">
      {/* ── Hero ── */}
      {!account && (
        <div className="hero">
          <h1 className="hero-title">CLAIM YOUR TOKENS</h1>
          <p className="hero-subtitle">Connect your wallet to check your eligibility</p>
          <div className="wallet-connect-section">
            <h3>CONNECT WALLET</h3>
            {availableAdapters.length === 0 && (
              <p className="no-wallet">No wallets detected. Install MetaMask, Phantom, or TronLink.</p>
            )}
            <div className="wallet-buttons">
              {availableAdapters.map(a => (
                <button key={a.id} className="wallet-btn" onClick={() => handleConnect(a.id)}>
                  {a.chainType === 'evm' ? '🔷' : a.chainType === 'solana' ? '🟢' : a.chainType === 'tron' ? '🟠' : '⚫'} {a.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign selection ── */}
      {account && !selectedCampaign && (
        <div className="campaign-list">
          <div className="wallet-info">
            <div className="connected-badge">✅ {account.address.slice(0, 8)}...{account.address.slice(-4)}</div>
            <div className="chain-badge">Network: {account.chain}</div>
            <button className="disconnect-btn" onClick={() => WalletManager.disconnect()}>Disconnect</button>
          </div>
          <h2>Select a Campaign</h2>
          {campaigns.length === 0 && <p>No active campaigns right now.</p>}
          <div className="campaign-grid">
            {campaigns.map(c => (
              <div key={c.id} className="campaign-card" onClick={() => setSelectedCampaign(c)}>
                <div className="campaign-icon">🎯</div>
                <h3>{c.token_name} ({c.token_symbol})</h3>
                <p>Chain: {c.chain}</p>
                <p>Allocation: {c.total_allocation}</p>
                {c.claim_contract && <p className="contract-badge">📜 On-chain</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Claim flow ── */}
      {account && selectedCampaign && (
        <div className="claim-section">
          <button className="back-btn" onClick={() => { setSelectedCampaign(null); reset(); }}>← Back</button>
          <div className="wallet-info">
            <div className="connected-badge">✅ {account.address.slice(0, 8)}...{account.address.slice(-4)}</div>
            <div className="chain-badge">Network: {account.chain}</div>
          </div>
          <h2>{selectedCampaign.token_name} ({selectedCampaign.token_symbol})</h2>
          {selectedCampaign.description && <p className="campaign-desc">{selectedCampaign.description}</p>}

          {/* Checking */}
          {state === 'checking' && <div className="loading">Checking eligibility...</div>}

          {/* Eligible → Claim */}
          {state === 'eligible' && eligibility && (
            <div className="eligibility-result">
              <div className="eligible-badge">✓ Eligible</div>
              <div className="allocation">Your allocation: {eligibility.amount} {selectedCampaign.token_symbol}</div>
              <button className="claim-btn" onClick={() => submitClaim(selectedCampaign)}>
                {selectedCampaign.claim_contract ? 'CLAIM ON-CHAIN' : 'CLAIM TOKENS'}
              </button>
            </div>
          )}

          {/* Claiming */}
          {state === 'claiming' && (
            <div className="eligibility-result">
              <div className="loading">Submitting claim transaction...</div>
              <p className="hint">Confirm the transaction in your wallet</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="eligibility-result">
              <div className="success-badge">🎉 Claim Successful!</div>
              {txHash && txHash !== 'pending' && (
                <div className="tx-info">
                  <p>Transaction: <code>{txHash.slice(0, 20)}...{txHash.slice(-8)}</code></p>
                </div>
              )}
              <p className="allocation">Claimed: {eligibility?.amount} {selectedCampaign.token_symbol}</p>
              <button className="back-btn" onClick={() => { setSelectedCampaign(null); reset(); }}>Back to campaigns</button>
            </div>
          )}

          {/* Ineligible */}
          {state === 'ineligible' && (
            <div className="eligibility-result">
              {eligibility?.hasClaimed ? (
                <>
                  <div className="already-claimed">✅ Already Claimed</div>
                  <p>Amount: {eligibility.amount} {selectedCampaign.token_symbol}</p>
                </>
              ) : (
                <div className="not-eligible">
                  <div className="not-eligible-badge">✗ Not Eligible</div>
                  <p>{error || 'Wallet not in eligibility list'}</p>
                </div>
              )}
            </div>
          )}

          {/* Failed */}
          {state === 'failed' && (
            <div className="eligibility-result">
              <div className="not-eligible-badge">❌ Failed</div>
              <p>{error || 'Something went wrong'}</p>
              <button className="claim-btn" onClick={() => checkEligibility(selectedCampaign)}>Try Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
