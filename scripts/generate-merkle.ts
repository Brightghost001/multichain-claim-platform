#!/usr/bin/env ts-node
// ═══════════════════════════════════════════════════════════
// Merkle tree generator — for admin to create claim lists
// Usage: npx ts-node scripts/generate-merkle.ts eligibility.json
// ═══════════════════════════════════════════════════════════

import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';
import * as fs from 'fs';

interface Entry { address: string; amount: string; }

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: npx ts-node scripts/generate-merkle.ts <eligibility.json>');
  process.exit(1);
}

const entries: Entry[] = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
console.log(`Processing ${entries.length} entries...`);

const leaves = entries.map(e =>
  ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [e.address, e.amount]))
);

const tree = new MerkleTree(leaves, (d) => ethers.keccak256(d), { sortPairs: true });
const root = tree.getHexRoot();

const proofs = entries.map((e, i) => ({
  address: e.address,
  amount: e.amount,
  proof: tree.getHexProof(leaves[i]),
}));

const output = { merkleRoot: root, entries: proofs };
const outFile = inputFile.replace('.json', '-merkle.json');
fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

console.log(`\nMerkle Root: ${root}`);
console.log(`Proofs written to: ${outFile}`);
console.log(`\nSet the merkle root in your ClaimContract and upload proofs to the admin API.`);
