// ═══════════════════════════════════════════════════════════
// Eligibility Engine — Merkle proof verification (Mongoose)
// ═══════════════════════════════════════════════════════════

import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';
import { Campaign, Eligibility } from '../database/models';

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
  async check(req: EligibilityCheck): Promise<EligibilityResult> {
    const { campaignId, walletAddress, chain } = req;

    // 1. Fetch campaign
    const campaign = await Campaign.findOne({ id: campaignId, status: 'active' });
    if (!campaign) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign not active' };
    }

    // 2. Check time window
    const now = Date.now();
    if (now < campaign.startTime.getTime()) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign not started yet' };
    }
    if (now > campaign.endTime.getTime()) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Campaign has ended' };
    }

    // 3. Chain match
    if (campaign.chain !== chain) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: `This claim is on ${campaign.chain}` };
    }

    // 4. Look up eligibility record
    const record = await Eligibility.findOne({
      campaignId,
      walletAddress: walletAddress.toLowerCase(),
      chain,
    });

    if (!record) {
      return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Wallet not in eligibility list' };
    }

    // 5. Already claimed?
    if (record.claimed) {
      return {
        eligible: false,
        amount: record.amount,
        merkleProof: record.merkleProof || [],
        hasClaimed: true,
        reason: 'Already claimed',
      };
    }

    // 6. Verify Merkle proof if present
    if (campaign.merkleRoot && record.merkleProof?.length > 0) {
      const leaf = ethers.keccak256(
        ethers.solidityPacked(['address', 'uint256'], [walletAddress, record.amount])
      );
      const tree = new MerkleTree([], () => '');
      const verified = tree.verify(record.merkleProof, leaf, campaign.merkleRoot);
      if (!verified) {
        return { eligible: false, amount: '0', merkleProof: [], hasClaimed: false, reason: 'Merkle proof verification failed' };
      }
    }

    return {
      eligible: true,
      amount: record.amount,
      merkleProof: record.merkleProof || [],
      hasClaimed: false,
    };
  }

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

  async importEligibility(
    campaignId: string,
    entries: { address: string; chain: string; amount: string; merkleProof?: string[] }[]
  ): Promise<number> {
    let imported = 0;
    for (const entry of entries) {
      try {
        await Eligibility.updateOne(
          { campaignId, walletAddress: entry.address.toLowerCase(), chain: entry.chain },
          { $setOnInsert: { amount: entry.amount, merkleProof: entry.merkleProof || [] } },
          { upsert: true }
        );
        imported++;
      } catch (e) {
        console.error(`Failed to import ${entry.address}:`, (e as Error).message);
      }
    }

    // Update campaign eligible count
    const count = await Eligibility.countDocuments({ campaignId });
    await Campaign.updateOne({ id: campaignId }, { totalEligible: count });

    return imported;
  }
}
