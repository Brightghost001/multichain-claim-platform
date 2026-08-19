// ═══════════════════════════════════════════════════════════
// API Routes — Fastify server for claim platform
// ═══════════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { EligibilityEngine } from '../eligibility/engine';
import { query } from '../database/client';

const engine = new EligibilityEngine();

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || true });
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 30),
    timeWindow: process.env.RATE_LIMIT_WINDOW_MS || '1 minute',
  });

  // ── Health ──
  app.get('/health', async () => ({ ok: true, timestamp: Date.now() }));

  // ── List campaigns ──
  app.get('/campaigns', async () => {
    const res = await query('SELECT * FROM campaigns WHERE status = $1 ORDER BY created_at DESC', ['active']);
    return { campaigns: res.rows };
  });

  // ── Get single campaign ──
  app.get('/campaigns/:id', async (req: any) => {
    const res = await query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (res.rows.length === 0) return { error: 'Campaign not found' };
    return { campaign: res.rows[0] };
  });

  // ── Check eligibility ──
  app.post('/eligibility/check', async (req: any) => {
    const { campaignId, walletAddress, chain } = req.body;
    if (!campaignId || !walletAddress || !chain) return { error: 'Missing fields' };
    const result = await engine.check({ campaignId, walletAddress, chain });
    return result;
  });

  // ── Submit claim ──
  app.post('/claims/submit', async (req: any) => {
    const { campaignId, walletAddress, chain, txHash, amount } = req.body;
    if (!campaignId || !walletAddress || !txHash) return { error: 'Missing fields' };

    // Insert claim record
    const res = await query(
      `INSERT INTO claims (campaign_id, wallet_address, chain, amount, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id`,
      [campaignId, walletAddress.toLowerCase(), chain, amount, txHash]
    );

    // Mark eligibility as claimed
    await query(
      `UPDATE eligibility SET claimed = true, claimed_at = NOW(), tx_hash = $1
       WHERE campaign_id = $2 AND wallet_address = $3 AND chain = $4`,
      [txHash, campaignId, walletAddress.toLowerCase(), chain]
    );

    // Update campaign total
    await query(
      `UPDATE campaigns SET total_claimed = total_claimed + $1 WHERE id = $2`,
      [amount, campaignId]
    );

    return { success: true, claimId: res.rows[0].id };
  });

  // ── Get claim status ──
  app.get('/claims/:id', async (req: any) => {
    const res = await query('SELECT * FROM claims WHERE id = $1', [req.params.id]);
    if (res.rows.length === 0) return { error: 'Claim not found' };
    return { claim: res.rows[0] };
  });

  // ── Admin: create campaign ──
  app.post('/admin/campaigns', async (req: any) => {
    const { id, name, tokenName, tokenSymbol, chain, startTime, endTime, totalAllocation, description } = req.body;
    await query(
      `INSERT INTO campaigns (id, name, token_name, token_symbol, chain, start_time, end_time, total_allocation, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')`,
      [id, name, tokenName, tokenSymbol, chain, startTime, endTime, totalAllocation, description]
    );
    return { success: true, campaignId: id };
  });

  // ── Admin: import eligibility ──
  app.post('/admin/campaigns/:id/eligibility', async (req: any) => {
    const { entries } = req.body;
    const imported = await engine.importEligibility(req.params.id, entries);
    return { success: true, imported };
  });

  // ── Admin: generate merkle tree ──
  app.post('/admin/campaigns/:id/merkle', async (req: any) => {
    const res = await query(
      'SELECT wallet_address, amount FROM eligibility WHERE campaign_id = $1',
      [req.params.id]
    );
    const entries = res.rows.map((r: any) => ({ address: r.wallet_address, amount: r.amount.toString() }));
    const { root, proofs } = engine.generateMerkleTree(entries);

    await query('UPDATE campaigns SET merkle_root = $1 WHERE id = $2', [root, req.params.id]);
    await query(
      `UPDATE eligibility SET merkle_proof = el.merkle_proof
       FROM (SELECT wallet_address, merkle_proof FROM eligibility WHERE campaign_id = $1) el`,
      [req.params.id]
    );

    return { success: true, merkleRoot: root, proofCount: Object.keys(proofs).length };
  });

  // ── Admin: activate campaign ──
  app.post('/admin/campaigns/:id/activate', async (req: any) => {
    await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['active', req.params.id]);
    return { success: true };
  });

  // ── Admin: pause campaign ──
  app.post('/admin/campaigns/:id/pause', async (req: any) => {
    await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['paused', req.params.id]);
    return { success: true };
  });

  // ── Admin: stats ──
  app.get('/admin/stats', async () => {
    const campaigns = await query('SELECT COUNT(*) as count FROM campaigns WHERE status = $1', ['active']);
    const eligible = await query('SELECT COUNT(*) as count FROM eligibility');
    const claimed  = await query('SELECT COUNT(*) as count FROM eligibility WHERE claimed = true');
    const tokens  = await query('SELECT COALESCE(SUM(total_claimed), 0) as total FROM campaigns');
    return {
      activeCampaigns: campaigns.rows[0].count,
      totalEligible: eligible.rows[0].count,
      totalClaimed: claimed.rows[0].count,
      tokensDistributed: tokens.rows[0].total,
    };
  });

  return app;
}
