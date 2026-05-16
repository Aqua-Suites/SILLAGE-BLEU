# Developer Onboarding

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install stellar-cli --locked` |
| Docker + Compose | — | [docker.com](https://docker.com) |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/sillage-bleu.git
cd sillage-bleu

# 2. Copy env
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
npm run infra:up

# 4. Install JS dependencies
npm install

# 5. Run backend in dev mode
cd backend/api-gateway && npm run dev

# 6. Run frontend in dev mode (new terminal)
cd frontend/web && npm run dev
```

Frontend: http://localhost:3000  
API: http://localhost:3001  
API health: http://localhost:3001/health

## Smart Contract Development

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Run all contract tests
cargo test

# Deploy to Soroban sandbox (local)
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/vessel_registry.wasm \
  --source <SECRET_KEY> --network testnet
```

## Running Tests

```bash
# Contracts
cargo test --manifest-path contracts/Cargo.toml

# Backend
cd backend/api-gateway && npm test

# SDK
cd sdk && npm test

# Frontend lint
cd frontend/web && npm run lint
```

## Project Structure

```
sillage-bleu/
├── contracts/          # Soroban Rust smart contracts
│   ├── shared/         # Shared types (Vessel, CatchEvent, BlueCredit…)
│   ├── vessel-registry/
│   ├── catch-verification/
│   ├── blue-credit-minting/
│   ├── settlement/
│   ├── esg-index/
│   └── scripts/        # deploy_testnet.sh
├── backend/
│   └── api-gateway/    # Express API + BullMQ workers
│       ├── src/
│       │   ├── routes/     # telemetry, catch, credits, esg, sms, auth
│       │   ├── workers/    # telemetryWorker, catchWorker
│       │   ├── services/   # fraudDetector, stellarService, smsService
│       │   ├── middleware/ # auth, errorHandler
│       │   └── db/         # pool, migrations
├── frontend/
│   └── web/            # Next.js 15 app
│       └── src/app/
│           ├── fisher/     # Fisher dashboard
│           ├── buyer/      # Buyer portal
│           ├── esg/        # ESG investor dashboard
│           └── regulator/  # Regulator dashboard
├── sdk/                # @sillage-bleu/sdk TypeScript client
│   └── src/
│       ├── vessel.ts
│       ├── catch.ts
│       ├── telemetry.ts
│       └── credits.ts
├── infra/
│   ├── docker-compose.yml
│   └── docker/         # api.Dockerfile, frontend.Dockerfile
└── docs/               # This documentation
```

## Git Workflow

```
main          ← production-ready, protected
develop       ← integration branch
feature/xxx   ← one branch per feature/module
```

- All PRs require CI to pass before merge
- Use the PR template in `.github/pull_request_template.md`
- Contracts: sign commits with `git commit -S`

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing session tokens |
| `STELLAR_SIGNER_SECRET` | Stellar keypair for contract calls |
| `AT_API_KEY` | Africa's Talking API key for SMS |
| `CONTRACT_*` | Contract addresses (populated after deploy) |
