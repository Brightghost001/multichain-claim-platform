// ═══════════════════════════════════════════════════════════
// API Client — typed wrapper for backend API calls
// ═══════════════════════════════════════════════════════════

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface CampaignDto {
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
  description?: string;
  logo_url?: string;
  merkle_root?: string;
  claim_contract?: string;
}

export interface EligibilityDto {
  eligible: boolean;
  amount: string;
  merkleProof: string[];
  hasClaimed: boolean;
  reason?: string;
}

export interface ClaimResultDto {
  success: boolean;
  claimId?: number;
  error?: string;
}

export const apiClient = {
  // ── Campaigns ──
  async getCampaigns(): Promise<CampaignDto[]> {
    const res = await fetch(`${API}/campaigns`);
    const data = await res.json();
    return data.campaigns || [];
  },

  async getCampaign(id: string): Promise<CampaignDto | null> {
    const res = await fetch(`${API}/campaigns/${id}`);
    const data = await res.json();
    return data.campaign || null;
  },

  // ── Eligibility ──
  async checkEligibility(campaignId: string, walletAddress: string, chain: string): Promise<EligibilityDto> {
    const res = await fetch(`${API}/eligibility/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, walletAddress, chain }),
    });
    return res.json();
  },

  // ── Claims ──
  async submitClaim(campaignId: string, walletAddress: string, chain: string, txHash: string, amount: string): Promise<ClaimResultDto> {
    const res = await fetch(`${API}/claims/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, walletAddress, chain, txHash, amount }),
    });
    return res.json();
  },

  async getClaimStatus(claimId: number): Promise<any> {
    const res = await fetch(`${API}/claims/${claimId}`);
    return res.json();
  },

  // ── Admin ──
  async createCampaign(data: any): Promise<any> {
    const res = await fetch(`${API}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async importEligibility(campaignId: string, entries: any[]): Promise<any> {
    const res = await fetch(`${API}/admin/campaigns/${campaignId}/eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    return res.json();
  },

  async generateMerkle(campaignId: string): Promise<any> {
    const res = await fetch(`${API}/admin/campaigns/${campaignId}/merkle`, {
      method: 'POST',
    });
    return res.json();
  },

  async activateCampaign(campaignId: string): Promise<any> {
    const res = await fetch(`${API}/admin/campaigns/${campaignId}/activate`, { method: 'POST' });
    return res.json();
  },

  async pauseCampaign(campaignId: string): Promise<any> {
    const res = await fetch(`${API}/admin/campaigns/${campaignId}/pause`, { method: 'POST' });
    return res.json();
  },

  async getStats(): Promise<any> {
    const res = await fetch(`${API}/admin/stats`);
    return res.json();
  },
};
