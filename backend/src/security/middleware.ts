// ═══════════════════════════════════════════════════════════
// Security Middleware — request validation, admin auth
// ═══════════════════════════════════════════════════════════

import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';

// ── Admin wallet whitelist ──
const ADMIN_WALLETS = (process.env.ADMIN_WALLET_ADDRESSES || '')
  .split(',')
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

// ── Verify admin access (wallet signature based) ──
export async function verifyAdmin(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers['x-admin-auth'] as string;
  if (!auth) {
    reply.code(401).send({ error: 'Admin authentication required' });
    return;
  }

  // Auth format: walletAddress:signature:timestamp
  // Signature is personal_sign of "admin-access:{timestamp}"
  const parts = auth.split(':');
  if (parts.length !== 3) {
    reply.code(401).send({ error: 'Invalid auth format' });
    return;
  }

  const [wallet, _sig, timestamp] = parts;

  // Check timestamp is recent (within 5 min)
  const age = Date.now() - parseInt(timestamp);
  if (age > 5 * 60 * 1000) {
    reply.code(401).send({ error: 'Auth expired' });
    return;
  }

  // Check wallet is in admin list
  if (!ADMIN_WALLETS.includes(wallet.toLowerCase())) {
    reply.code(403).send({ error: 'Not an admin wallet' });
    return;
  }

  // TODO: verify signature via viem/ethers
  // For now, just check the wallet is whitelisted
}

// ── Request signing validation (anti-bot) ──
export function validateRequestSignature(body: any, signature: string, walletAddress: string): boolean {
  // In production: verify the wallet signed the request body hash
  // This prevents replay attacks and bot flooding
  const expectedBody = JSON.stringify(body);
  const bodyHash = createHash('sha256').update(expectedBody).digest('hex');
  // TODO: verify signature against bodyHash using viem
  return Boolean(signature && walletAddress);
}

// ── IP-based throttling (supplements Fastify rate-limit) ──
const ipRequestCounts: Map<string, { count: number; windowStart: number }> = new Map();

export function checkIpThrottle(ip: string, maxPerMin: number = 10): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now - entry.windowStart > 60000) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxPerMin) return false;
  entry.count++;
  return true;
}
