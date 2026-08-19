// ═══════════════════════════════════════════════════════════
// API Routes — Fastify server (Mongoose/MongoDB Atlas)
// ═══════════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { EligibilityEngine } from '../eligibility/engine';
import { Campaign, Eligibility, Claim } from '../database/models';
import mongoose from 'mongoose';

const engine = new EligibilityEngine();

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: process.env.FRONTEND_URL || true });
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 30),
    timeWindow: process.env.RATE_LIMIT_WINDOW_MS || '1 minute',
  });

  // ── Health ──
  app.get('/health', async () => ({
    ok: true,
    timestamp: Date.now(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  }));

  // ── List campaigns ──
  app.get('/campaigns', async () => {
    const campaigns = await Campaign.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    return { campaigns };
  });

  // ── Get single campaign ──
  app.get('/campaigns/:id', async (req: any) => {
    const campaign = await Campaign.findOne({ id: req.params.id }).lean();
    if (!campaign) return { error: 'Campaign not found' };
    return { campaign };
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

    const claim = await Claim.create({
      campaignId,
      walletAddress: walletAddress.toLowerCase(),
      chain,
      amount,
      txHash,
      status: 'pending',
    });

    // Mark eligibility as claimed
    await Eligibility.updateOne(
      { campaignId, walletAddress: walletAddress.toLowerCase(), chain },
      { claimed: true, claimedAt: new Date(), txHash }
    );

    // Update campaign total
    await Campaign.updateOne(
      { id: campaignId },
      { $inc: { totalClaimed: BigInt(amount) } }
    );

    return { success: true, claimId: claim._id };
  });

  // ── Get claim status ──
  app.get('/claims/:id', async (req: any) => {
    const claim = await Claim.findById(req.params.id).lean();
    if (!claim) return { error: 'Claim not found' };
    return { claim };
  });

  // ── Admin: create campaign ──
  app.post('/admin/campaigns', async (req: any) => {
    const { id, name, tokenName, tokenSymbol, chain, startTime, endTime, totalAllocation, description } = req.body;
    await Campaign.create({
      id, name, tokenName, tokenSymbol, chain,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      totalAllocation, description, status: 'draft',
    });
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
    const records = await Eligibility.find({ campaignId: req.params.id }).lean();
    const entries = records.map((r: any) => ({ address: r.walletAddress, amount: r.amount }));
    const { root, proofs } = engine.generateMerkleTree(entries);

    await Campaign.updateOne({ id: req.params.id }, { merkleRoot: root });

    // Update proofs on eligibility records
    for (const [address, proof] of Object.entries(proofs)) {
      await Eligibility.updateOne(
        { campaignId: req.params.id, walletAddress: address },
        { merkleProof: proof }
      );
    }

    return { success: true, merkleRoot: root, proofCount: Object.keys(proofs).length };
  });

  // ── Admin: activate campaign ──
  app.post('/admin/campaigns/:id/activate', async (req: any) => {
    await Campaign.updateOne({ id: req.params.id }, { status: 'active' });
    return { success: true };
  });

  // ── Admin: pause campaign ──
  app.post('/admin/campaigns/:id/pause', async (req: any) => {
    await Campaign.updateOne({ id: req.params.id }, { status: 'paused' });
    return { success: true };
  });

  // ── Admin: set claim contract address ──
  app.post('/admin/campaigns/:id/contract', async (req: any) => {
    const { contractAddress } = req.body;
    await Campaign.updateOne({ id: req.params.id }, { claimContract: contractAddress });
    return { success: true };
  });

  // ── Admin: stats ──
  app.get('/admin/stats', async () => {
    const [activeCampaigns, totalEligible, totalClaimed] = await Promise.all([
      Campaign.countDocuments({ status: 'active' }),
      Eligibility.countDocuments({}),
      Eligibility.countDocuments({ claimed: true }),
    ]);
    const campaigns = await Campaign.find({}).lean();
    const tokensDistributed = campaigns.reduce((sum, c) => sum + BigInt(c.totalClaimed || '0'), 0n);
    return {
      activeCampaigns,
      totalEligible,
      totalClaimed,
      tokensDistributed: tokensDistributed.toString(),
    };
  });

  // ── Admin: analytics (time series) ──
  app.get('/admin/analytics', async () => {
    const claims = await Claim.find({ status: 'confirmed' }).lean();
    
    // Group by day
    const byDay: Record<string, number> = {};
    for (const c of claims) {
      const day = new Date(c.createdAt).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // Group by chain
    const byChain: Record<string, number> = {};
    for (const c of claims) {
      byChain[c.chain] = (byChain[c.chain] || 0) + 1;
    }

    return {
      claimsByDay: byDay,
      claimsByChain: byChain,
      totalClaims: claims.length,
    };
  });

  return app;
}
