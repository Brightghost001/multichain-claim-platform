// ═══════════════════════════════════════════════════════════
// Mongoose Models — MongoDB Atlas collections
// ═══════════════════════════════════════════════════════════

import mongoose, { Schema, Document } from 'mongoose';

// ── Connect to MongoDB Atlas ──
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  
  await mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 20,
  });
  console.log('✅ MongoDB Atlas connected');
}

// ── Campaign Schema ──
export interface ICampaign extends Document {
  id: string;
  name: string;
  tokenName: string;
  tokenSymbol: string;
  chain: string;
  claimContract?: string;
  merkleRoot?: string;
  startTime: Date;
  endTime: Date;
  status: 'draft' | 'active' | 'paused' | 'ended';
  totalAllocation: string;
  totalClaimed: string;
  totalEligible: number;
  description?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
  id:           { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  tokenName:    { type: String, required: true },
  tokenSymbol:  { type: String, required: true },
  chain:        { type: String, required: true, index: true },
  claimContract:{ type: String, default: null },
  merkleRoot:   { type: String, default: null },
  startTime:    { type: Date, required: true },
  endTime:      { type: Date, required: true },
  status:       { type: String, enum: ['draft', 'active', 'paused', 'ended'], default: 'draft', index: true },
  totalAllocation: { type: String, default: '0' },
  totalClaimed:    { type: String, default: '0' },
  totalEligible:    { type: Number, default: 0 },
  description:  { type: String, default: '' },
  logoUrl:      { type: String, default: null },
}, { timestamps: true, collection: 'campaigns' });

export const Campaign = mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);

// ── Eligibility Schema ──
export interface IEligibility extends Document {
  campaignId: string;
  walletAddress: string;
  chain: string;
  amount: string;
  merkleProof: string[];
  claimed: boolean;
  claimedAt?: Date;
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EligibilitySchema = new Schema<IEligibility>({
  campaignId:   { type: String, required: true, index: true },
  walletAddress:{ type: String, required: true, index: true },
  chain:        { type: String, required: true },
  amount:       { type: String, required: true },
  merkleProof:  { type: [String], default: [] },
  claimed:      { type: Boolean, default: false, index: true },
  claimedAt:    { type: Date, default: null },
  txHash:       { type: String, default: null },
}, { timestamps: true, collection: 'eligibility' });

EligibilitySchema.index({ campaignId: 1, walletAddress: 1, chain: 1 }, { unique: true });

export const Eligibility = mongoose.models.Eligibility || mongoose.model<IEligibility>('Eligibility', EligibilitySchema);

// ── Claim Schema ──
export interface IClaim extends Document {
  campaignId: string;
  walletAddress: string;
  chain: string;
  amount: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
}

const ClaimSchema = new Schema<IClaim>({
  campaignId:   { type: String, required: true, index: true },
  walletAddress:{ type: String, required: true, index: true },
  chain:        { type: String, required: true },
  amount:       { type: String, required: true },
  txHash:       { type: String, required: true },
  status:       { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending', index: true },
  confirmedAt:  { type: Date, default: null },
}, { timestamps: true, collection: 'claims' });

export const Claim = mongoose.models.Claim || mongoose.model<IClaim>('Claim', ClaimSchema);

// ── User Schema ──
export interface IUser extends Document {
  walletAddress: string;
  chain: string;
  lastSeen: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  walletAddress: { type: String, required: true, index: true },
  chain:         { type: String, required: true },
  lastSeen:      { type: Date, default: Date.now },
}, { timestamps: true, collection: 'users' });

UserSchema.index({ walletAddress: 1, chain: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
