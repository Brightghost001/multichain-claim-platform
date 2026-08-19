// ═══════════════════════════════════════════════════════════
// Admin Dashboard — campaign management, eligibility, stats
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Stats {
  activeCampaigns: number;
  totalEligible: number;
  totalClaimed: number;
  tokensDistributed: string;
}

interface Campaign {
  id: string;
  name: string;
  token_name: string;
  token_symbol: string;
  chain: string;
  status: string;
  start_time: string;
  end_time: string;
  total_allocation: string;
  total_claimed: string;
  total_eligible: number;
}

type View = 'overview' | 'create' | 'import' | 'list';

export default function Admin() {
  const [view, setView] = useState<View>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ── Form state ──
  const [form, setForm] = useState({
    id: '', name: '', tokenName: '', tokenSymbol: '',
    chain: 'ethereum', startTime: '', endTime: '',
    totalAllocation: '', description: '',
  });
  const [importCampaignId, setImportCampaignId] = useState('');
  const [importData, setImportData] = useState('');
  const [merkleCampaignId, setMerkleCampaignId] = useState('');

  useEffect(() => { refresh(); }, []);

  const refresh = () => {
    fetch(`${API}/admin/stats`).then(r => r.json()).then(setStats).catch(console.error);
    fetch(`${API}/campaigns`).then(r => r.json()).then(d => setCampaigns(d.campaigns || [])).catch(console.error);
  };

  const api = async (url: string, body?: any) => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setMessage(data.success ? '✅ Done' : `❌ ${data.error || 'Failed'}`);
      refresh();
    } catch (e: any) { setMessage(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  // ── Overview ──
  if (view === 'overview') return (
    <div className="admin-page">
      <h1 className="admin-title">📊 Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.activeCampaigns ?? '—'}</div>
          <div className="stat-label">Active Campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalEligible ?? '—'}</div>
          <div className="stat-label">Total Eligible</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalClaimed ?? '—'}</div>
          <div className="stat-label">Total Claimed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.tokensDistributed ?? '0'}</div>
          <div className="stat-label">Tokens Distributed</div>
        </div>
      </div>

      <div className="admin-nav">
        <button className="nav-btn" onClick={() => setView('create')}>➕ Create Campaign</button>
        <button className="nav-btn" onClick={() => setView('import')}>📥 Import Eligibility</button>
        <button className="nav-btn" onClick={() => setView('list')}>📋 All Campaigns</button>
      </div>

      <div className="campaign-list-admin">
        <h2>Active Campaigns</h2>
        {campaigns.length === 0 && <p className="empty">No active campaigns.</p>}
        {campaigns.map(c => (
          <div key={c.id} className="campaign-row">
            <div className="campaign-info">
              <strong>{c.token_name} ({c.token_symbol})</strong>
              <span className="chain-tag">{c.chain}</span>
            </div>
            <div className="campaign-stats-mini">
              <span>Eligible: {c.total_eligible}</span>
              <span>Claimed: {c.total_claimed}</span>
              <span>Allocated: {c.total_allocation}</span>
            </div>
            <div className="campaign-actions">
              <button className="action-btn" onClick={() => api(`${API}/admin/campaigns/${c.id}/pause`)}>⏸ Pause</button>
              <button className="action-btn danger" onClick={() => api(`${API}/admin/campaigns/${c.id}/activate`)}>▶ Activate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Create Campaign ──
  if (view === 'create') return (
    <div className="admin-page">
      <button className="back-btn" onClick={() => setView('overview')}>← Back</button>
      <h1 className="admin-title">➕ Create Campaign</h1>
      {message && <div className="msg">{message}</div>}
      <form onSubmit={(e) => { e.preventDefault(); api(`${API}/admin/campaigns`, form); }} className="admin-form">
        <div className="form-row">
          <label>Campaign ID</label>
          <input value={form.id} onChange={e => setForm({...form, id: e.target.value})} placeholder="summer-airdrop-2026" required />
        </div>
        <div className="form-row">
          <label>Campaign Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Summer Airdrop 2026" required />
        </div>
        <div className="form-row-pair">
          <div className="form-row">
            <label>Token Name</label>
            <input value={form.tokenName} onChange={e => setForm({...form, tokenName: e.target.value})} required />
          </div>
          <div className="form-row">
            <label>Token Symbol</label>
            <input value={form.tokenSymbol} onChange={e => setForm({...form, tokenSymbol: e.target.value})} placeholder="SMP" required />
          </div>
        </div>
        <div className="form-row">
          <label>Chain</label>
          <select value={form.chain} onChange={e => setForm({...form, chain: e.target.value})}>
            <option value="ethereum">Ethereum</option>
            <option value="bsc">BNB Chain</option>
            <option value="base">Base</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="polygon">Polygon</option>
            <option value="avalanche">Avalanche</option>
            <option value="optimism">Optimism</option>
            <option value="solana">Solana</option>
            <option value="tron">Tron</option>
            <option value="xrpl">XRP Ledger</option>
          </select>
        </div>
        <div className="form-row-pair">
          <div className="form-row">
            <label>Start Time</label>
            <input type="datetime-local" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required />
          </div>
          <div className="form-row">
            <label>End Time</label>
            <input type="datetime-local" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required />
          </div>
        </div>
        <div className="form-row">
          <label>Total Allocation</label>
          <input value={form.totalAllocation} onChange={e => setForm({...form, totalAllocation: e.target.value})} placeholder="1000000" required />
        </div>
        <div className="form-row">
          <label>Description (optional)</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
        </div>
        <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Campaign'}</button>
      </form>
    </div>
  );

  // ── Import Eligibility ──
  if (view === 'import') return (
    <div className="admin-page">
      <button className="back-btn" onClick={() => setView('overview')}>← Back</button>
      <h1 className="admin-title">📥 Import Eligibility & Generate Merkle</h1>
      {message && <div className="msg">{message}</div>}

      <div className="admin-form">
        <div className="form-row">
          <label>Campaign ID</label>
          <input value={importCampaignId} onChange={e => setImportCampaignId(e.target.value)} placeholder="summer-airdrop-2026" />
        </div>
        <div className="form-row">
          <label>Eligibility List (JSON array)</label>
          <textarea
            value={importData}
            onChange={e => setImportData(e.target.value)}
            rows={10}
            placeholder={'[{"address":"0x...","chain":"ethereum","amount":"25000"},...]'}
          />
        </div>
        <button className="submit-btn" disabled={loading} onClick={() => {
          try {
            const entries = JSON.parse(importData);
            api(`${API}/admin/campaigns/${importCampaignId}/eligibility`, { entries });
          } catch { setMessage('❌ Invalid JSON'); }
        }}>Import Eligibility</button>

        <hr className="divider" />

        <div className="form-row">
          <label>Generate Merkle Tree for Campaign</label>
          <input value={merkleCampaignId} onChange={e => setMerkleCampaignId(e.target.value)} placeholder="summer-airdrop-2026" />
        </div>
        <button className="submit-btn" disabled={loading} onClick={() => api(`${API}/admin/campaigns/${merkleCampaignId}/merkle`)}>
          Generate Merkle Root
        </button>
      </div>
    </div>
  );

  // ── All Campaigns List ──
  if (view === 'list') return (
    <div className="admin-page">
      <button className="back-btn" onClick={() => setView('overview')}>← Back</button>
      <h1 className="admin-title">📋 All Campaigns</h1>
      {campaigns.length === 0 && <p className="empty">No campaigns found.</p>}
      {campaigns.map(c => (
        <div key={c.id} className="campaign-detail-card">
          <div className="campaign-header-row">
            <h3>{c.name || c.token_name}</h3>
            <span className={`status-badge ${c.status}`}>{c.status}</span>
          </div>
          <div className="campaign-meta">
            <div><strong>Token:</strong> {c.token_name} ({c.token_symbol})</div>
            <div><strong>Chain:</strong> {c.chain}</div>
            <div><strong>Start:</strong> {new Date(c.start_time).toLocaleString()}</div>
            <div><strong>End:</strong> {new Date(c.end_time).toLocaleString()}</div>
            <div><strong>Allocation:</strong> {c.total_allocation}</div>
            <div><strong>Claimed:</strong> {c.total_claimed}</div>
            <div><strong>Eligible wallets:</strong> {c.total_eligible}</div>
            {c.merkle_root && <div><strong>Merkle Root:</strong> <code>{String(c.merkle_root).slice(0, 20)}...</code></div>}
            {c.claim_contract && <div><strong>Contract:</strong> <code>{c.claim_contract}</code></div>}
          </div>
          <div className="campaign-actions">
            {c.status === 'active' && <button className="action-btn" onClick={() => api(`${API}/admin/campaigns/${c.id}/pause`)}>⏸ Pause</button>}
            {c.status === 'paused' && <button className="action-btn" onClick={() => api(`${API}/admin/campaigns/${c.id}/activate`)}>▶ Activate</button>}
            <button className="action-btn" onClick={() => { setImportCampaignId(c.id); setMerkleCampaignId(c.id); setView('import'); }}>📥 Import / Merkle</button>
          </div>
        </div>
      ))}
    </div>
  );

  return null;
}
