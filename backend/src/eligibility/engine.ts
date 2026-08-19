// ═══════════════════════════════════════════════════════════
// Eligibility Engine — checks if a wallet can claim
// Supports: Merkle proof, whitelist, balance, NFT holder
// ═══════════════════════════════════════════════════════════

import { query } from '../database/client';
import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';

export interface EligibilityCheck {
  campaignId: string;
  walletAddress: string;
  chain: string;
}

export interface EligibilityResult {
  eligible: boolean;
  amount: string;
  merkleProof: string[];
  hasClaimed: boolean;
  reason?: string;
}

export class EligibilityEngine {
  // ── Check eligibility for a wallet in a campaign ──
  async check(req: EligibilityCheck): Promise<EligibilityResult> {
    const { campaignId, walletAddress, chain } = req;

    // 1. Fetch campaign
    const campaignRes = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND status = $2',
      [campaignId, 'active']
    );
    if (campaignRes.rows.length === 0) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign not active' };
    }
    const campaign = campaignRes.rows[0];

    // 2. Check campaign time window
    const now = Date.now();
    if (now < new Date(campaign.start_time).getTime()) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign not started yet' };
    }
    if (now > new Date(campaign.end_time).getTime()) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign has ended' };
    }

    // 3. Check chain match
    if (campaign.chain !== chain) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: `This claim is on ${campaign.chain}` };
    }

    // 4. Look up eligibility record
    const eligRes = await query(
      'SELECT * FROM eligibility WHERE campaign_id = $1 AND wallet_address = $2 AND chain = $3',
      [campaignId, walletAddress.toLowerCase(), chain]
    );

    if (eligRes.rows.length === 0) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Wallet not in eligibility list' };
    }

    const record = eligRes.rows[0];

    // 5. Already claimed?
    if (record.claimed) {
      return {
        eligible: false,
        amount: record.amount.toString(),
        merkleProof: record.merkle_proof || [],
        hasClaimed: true,
        reason: 'Already claimed',
      };
    }

    // 6. Verify Merkle proof if present
    if (campaign.merkle_root && record.merkle_proof) {
      const leaf = ethers.keccak256(
        ethers.solidityPacked(['address', 'uint256'], [walletAddress, record.amount])
      );
      const tree = new MerkleTree([], () => '');
      const verified = tree.verify(
        record.merkle_proof,
        leaf,
        campaign.merkle_root
      );
      if (!verified) {
        return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Merkle proof verification failed' };
      }
    }

    return {
      eligible: true,
      amount: record.amount.toString(),
      merkleProof: record.merkle_proof || [],
      hasClaimed: false,
    };
  }

  // ── Generate Merkle tree from eligibility list ──
  generateMerkleTree(
    entries: { address: string; amount: string }[]
  ): { root: string; proofs: Record<string, string[]> } {
    const leaves = entries.map(e =>
      ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [e.address, e.amount]))
    );
    const tree = new MerkleTree(leaves, (data) => ethers.keccak256(data), { sortPairs: true });
    const root = tree.getHexRoot();
    const proofs: Record<string, string[]> = {};
    for (const [i, entry] of entries.entries()) {
      proofs[entry.address.toLowerCase()] = tree.getHexProof(leaves[i]);
    }
    return { root, proofs };
  }

  // ── Bulk import eligibility list ──
  async importEligibility(
    campaignId: string,
    entries: { address: string; chain: string; amount: string; merkleProof?: string[] }[]
  ): Promise<number> {
    let imported = 0;
    for (const entry of entries) {
      try {
        await query(
          `INSERT INTO eligibility (campaign_id, wallet_address, chain, amount, merkle_proof)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (campaign_id, wallet_address, chain) DO NOTHING`,
          [campaignId, entry.address.toLowerCase(), entry.chain, entry.amount, JSON.stringify(entry.merkleProof || [])]
        );
        imported++;
      } catch (e) {
        console.error(`Failed to import ${entry.address}:`, (e as Error).message);
      }
    }

    // Update campaign eligible count
    await query(
      'UPDATE campaigns SET total_eligible = (SELECT COUNT(*) FROM eligibility WHERE campaign_id = $1) WHERE id = $1',
      [campaignId]
    );

    return imported;
  }
}
