// ═══════════════════════════════════════════════════════════
// Analytics Dashboard — claim rate, per-chain breakdown
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Analytics {
  claimsByDay: Record<string, number>;
  claimsByChain: Record<string, number>;
  totalClaims: number;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  base: '#0052ff',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  avalanche: '#e84142',
  optimism: '#ff0420',
  solana: '#9945ff',
  tron: '#ef0027',
  xrpl: '#23a96e',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/analytics`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading analytics...</p></div>;
  if (!data) return <div className="page"><p>Failed to load.</p></div>;

  const days = Object.keys(data.claimsByDay).sort();
  const maxDay = Math.max(...Object.values(data.claimsByDay));
  const chains = Object.entries(data.claimsByChain).sort((a, b) => b[1] - a[1]);
  const totalChainClaims = chains.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 24, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>📊 Analytics</h1>

      {/* Total claims */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#667eea' }}>{data.totalClaims}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: 4 }}>Total Claims Confirmed</div>
      </div>

      {/* Claims by day */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Claims Over Time</h3>
        {days.length === 0 ? (
          <p style={{ opacity: 0.5 }}>No claims yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {days.slice(-30).map(day => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${(data.claimsByDay[day] / maxDay) * 100}%`,
                  minHeight: 4,
                  background: 'linear-gradient(180deg, #667eea, #764ba2)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s',
                }} title={`${day}: ${data.claimsByDay[day]} claims`} />
                <span style={{ fontSize: '0.55rem', opacity: 0.4, marginTop: 4, transform: 'rotate(-45deg)' }}>{day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claims by chain */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Claims by Chain</h3>
        {chains.length === 0 ? (
          <p style={{ opacity: 0.5 }}>No chain data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chains.map(([chain, count]) => (
              <div key={chain} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: CHAIN_COLORS[chain] || '#667eea', flexShrink: 0 }} />
                <span style={{ width: 80, fontWeight: 600, textTransform: 'capitalize' }}>{chain}</span>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(count / totalChainClaims) * 100}%`,
                    height: '100%',
                    background: CHAIN_COLORS[chain] || '#667eea',
                    borderRadius: 6,
                    transition: 'width 0.5s',
                  }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', opacity: 0.7 }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <a href="/" style={{ marginTop: 24, color: '#667eea', textDecoration: 'none' }}>← Back to claims</a>
    </div>
  );
}
