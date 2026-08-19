# Multi-Chain Claim Platform

A modular, multi-chain token claim platform with Merkle-based eligibility, wallet adapters for EVM/Solana/Tron/XRPL, and an admin dashboard.

## Architecture

```
ClaimPlatform/
├── frontend/          # Next.js frontend
│   └── src/
│       ├── wallet/    # Wallet adapter layer (plugins per chain)
│       │   ├── WalletManager.ts      # Unified connection interface
│       │   ├── types.ts              # Chain registry, types
│       │   └── adapters/             # EVM, Solana, Tron, XRPL adapters
│       ├── pages/     # index.tsx (claim flow)
│       └── styles/   # Global CSS
├── backend/           # Fastify API server
│   └── src/
│       ├── api/routes.ts            # REST endpoints
│       ├── eligibility/engine.ts    # Merkle eligibility engine
│       ├── database/               # PostgreSQL schema + client
│       └── server.ts               # Entry point
├── contracts/         # Solidity claim contracts
│   └── evm/ClaimContract.sol
├── .env.example
└── package.json
```

## Chains Supported

**EVM:** Ethereum, BSC, Base, Arbitrum, Polygon, Avalanche, Optimism
**Non-EVM:** Solana, Tron, XRP Ledger

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. `npm install`
3. Run PostgreSQL and Redis
4. Apply `backend/src/database/schema.sql`
5. `npm run backend:dev` (starts API on :4000)
6. `npm run dev` (starts frontend on :3000)

## Claim Flow

Landing → Connect Wallet → Detect Chain → Select Campaign → Check Eligibility → Claim → Transaction Confirmed

## License

MIT
