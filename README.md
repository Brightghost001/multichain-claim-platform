# Multi-Chain Claim Platform

A modular, multi-chain token claim platform with Merkle-based eligibility, wallet adapters for EVM/Solana/Tron/XRPL, and an admin dashboard.

## Architecture

```
multichain-claim-platform/
├── frontend/               # Next.js frontend
│   └── src/
│       ├── wallet/         # Wallet adapter layer (plugins per chain)
│       │   ├── WalletManager.ts
│       │   ├── types.ts
│       │   └── adapters/   # EVM, Solana, Tron, XRPL
│       ├── hooks/          # useClaim — full claim flow state machine
│       ├── lib/            # API client, viem contract client
│       ├── pages/          # index, admin, analytics
│       └── styles/         # Global CSS
├── backend/                # Fastify API server
│   └── src/
│       ├── api/routes.ts          # REST endpoints
│       ├── eligibility/engine.ts  # Merkle eligibility engine
│       ├── database/models.ts     # Mongoose models (MongoDB Atlas)
│       ├── blockchain/           # EVM monitor, RPC failover
│       ├── workers/               # Claim processor worker
│       ├── security/              # Admin auth, rate limiting
│       └── server.ts
├── contracts/
│   ├── evm/ClaimContract.sol      # Solidity claim contract
│   └── solana/                    # Anchor-based Solana claim program
├── scripts/                # Deploy, Merkle generator, examples
├── railpack.toml           # Railway deployment config
├── Dockerfile             # Docker image
├── docker-compose.yml     # Local dev setup
├── hardhat.config.ts       # Solidity compile + deploy
└── .env.example
```

## Chains Supported

**EVM:** Ethereum, BSC, Base, Arbitrum, Polygon, Avalanche, Optimism
**Non-EVM:** Solana, Tron, XRP Ledger

## Database

MongoDB Atlas via Mongoose. Set `MONGODB_URI` in your environment.

## Deployment

### Railway

1. Push this repo to GitHub
2. Create a new Railway project from the repo
3. Set environment variables (see `.env.example`)
4. Railway will use `railpack.toml` to build and deploy

### Docker

```bash
# Set MONGODB_URI in .env
docker compose up --build
```

### Local Dev

```bash
npm install
npm run backend:dev   # API on :4000
npm run dev           # Frontend on :3000
```

## Contract Deployment

```bash
# Set CLAIM_TOKEN_ADDRESS, CLAIM_MERKLE_ROOT, CLAIM_DEADLINE, DEPLOYER_PRIVATE_KEY in .env
npx hardhat compile
npx hardhat run scripts/deploy.ts --network base-sepolia
```

## Claim Flow

Landing → Connect Wallet → Detect Chain → Select Campaign → Check Eligibility → Claim (On-Chain) → Confirmed

## License

MIT
