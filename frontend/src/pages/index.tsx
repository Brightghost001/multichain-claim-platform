// ═══════════════════════════════════════════════════════════
// Landing page — Hero → Connect Wallet → Eligibility → Claim
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { WalletManager } from '../wallet/WalletManager';
import type { WalletAccount, Campaign, EligibilityResult } from '../wallet/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Home() {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);

  // Subscribe to wallet changes
  useEffect(() => {
    const unsub = WalletManager.subscribe(setAccount);
    return unsub;
  }, []);

  // Fetch campaigns
  useEffect(() => {
    fetch(`${API}/campaigns`)
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns || []))
      .catch(console.error);
  }, []);

  // Check eligibility when account or campaign changes
  useEffect(() => {
    if (!account || !selectedCampaign) return;
    setChecking(true);
    setEligibility(null);
    fetch(`${API}/eligibility/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: selectedCampaign.id,
        walletAddress: account.address,
        chain: account.chain,
      }),
    })
      .then(r => r.json())
      .then(setEligibility)
      .catch(console.error)
      .finally(() => setChecking(false));
  }, [account, selectedCampaign]);

  const handleConnect = async (adapterId: string) => {
    try { await WalletManager.connect(adapterId); }
    catch (e: any) { alert(e.message); }
  };

  const handleClaim = async () => {
    if (!account || !selectedCampaign || !eligibility?.eligible) return;
    setClaiming(true);
    // In production: call claim contract with merkle proof via wagmi/viem
    // For now: submit to backend
    fetch(`${API}/claims/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: selectedCampaign.id,
        walletAddress: account.address,
        chain: account.chain,
        txHash: 'pending', // replaced after on-chain tx
        amount: eligibility.amount,
      }),
    })
      .then(r => r.json())
      .then(d => {
        setClaimResult(d.success ? '🎉 Claim successful!' : 'Claim failed');
      })
      .catch(() => setClaimResult('Claim failed'))
      .finally(() => setClaiming(false));
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

      {/* ── Connected: Campaign selection ── */}
      {account && !selectedCampaign && (
        <div className="campaign-list">
          <div className="wallet-info">
            <div className="connected-badge">✅ Connected: {account.address.slice(0, 8)}...{account.address.slice(-4)}</div>
            <div className="chain-badge">Network: {account.chain}</div>
          </div>
          <h2>Select a Campaign</h2>
          {campaigns.length === 0 && <p>No active campaigns right now.</p>}
          <div className="campaign-grid">
            {campaigns.map(c => (
              <div key={c.id} className="campaign-card" onClick={() => setSelectedCampaign(c)}>
                <div className="campaign-icon">{c.logoUrl ? <img src={c.logoUrl} alt="" /> : '🎯'}</div>
                <h3>{c.tokenName} ({c.tokenSymbol})</h3>
                <p>Chain: {c.chain}</p>
                <p>Allocation: {c.totalAllocation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Eligibility + Claim ── */}
      {account && selectedCampaign && (
        <div className="claim-section">
          <button className="back-btn" onClick={() => setSelectedCampaign(null)}>← Back</button>
          <div className="wallet-info">
            <div className="connected-badge">✅ {account.address.slice(0, 8)}...{account.address.slice(-4)}</div>
            <div className="chain-badge">Network: {account.chain}</div>
          </div>

          <h2>{selectedCampaign.tokenName} ({selectedCampaign.tokenSymbol})</h2>
          {selectedCampaign.description && <p className="campaign-desc">{selectedCampaign.description}</p>}

          {checking && <div className="loading">Checking eligibility...</div>}

          {eligibility && !checking && (
            <div className="eligibility-result">
              {eligibility.hasClaimed ? (
                <>
                  <div className="already-claimed">✅ Already Claimed</div>
                  <p>Amount: {eligibility.amount}</p>
                </>
              ) : eligibility.eligible ? (
                <>
                  <div className="eligible-badge">✓ Eligible</div>
                  <div className="allocation">Your allocation: {eligibility.amount} {selectedCampaign.tokenSymbol}</div>
                  <button className="claim-btn" disabled={claiming} onClick={handleClaim}>
                    {claiming ? 'Claiming...' : 'CLAIM TOKENS'}
                  </button>
                  {claimResult && <div className="claim-result">{claimResult}</div>}
                </>
              ) : (
                <div className="not-eligible">
                  <div className="not-eligible-badge">✗ Not Eligible</div>
                  <p>{eligibility.reason || 'Wallet not in eligibility list'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Disconnect ── */}
      {account && (
        <button className="disconnect-btn" onClick={() => WalletManager.disconnect()}>
          Disconnect Wallet
        </button>
      )}
    </div>
  );
}
