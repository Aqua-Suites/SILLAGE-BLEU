# Architecture Guide

## System Overview

Sillage Bleu is a decentralized marine sustainability infrastructure built on Stellar/Soroban. It transforms fishing activity into verifiable sustainability assets and tradable blue carbon credits.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  Fisher (mobile/SMS)  Buyer (web)  ESG Investor  Regulator     │
└────────────┬──────────────┬──────────────┬──────────┬──────────┘
             │              │              │          │
             ▼              ▼              ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                        │
│  /fisher  /buyer  /esg  /regulator                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  API GATEWAY (Express/Node)                     │
│  /telemetry  /catch  /credits  /esg  /sms  /auth               │
│  Rate limiting · JWT auth · Audit logging                       │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌────────┐  ┌──────────────┐
│PostgreSQL│  │  BullMQ/     │  │ Redis  │  │ Africa's     │
│(PostGIS) │  │  Workers     │  │ Cache  │  │ Talking SMS  │
└──────────┘  └──────┬───────┘  └────────┘  └──────────────┘
                     │
                     ▼ Soroban RPC
┌─────────────────────────────────────────────────────────────────┐
│                  STELLAR / SOROBAN                              │
│  VesselRegistry  CatchVerification  BlueCreditMinting           │
│  Settlement      ESGIndex                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Catch Lifecycle
```
Fisher submits catch
  → API validates input (Zod)
  → Stored in PostgreSQL (status: pending)
  → Queued in BullMQ (catch-validation)
  → FraudDetector checks: duplicate window, weight, GPS, vessel status
  → If clean: submitted to CatchVerification Soroban contract
  → Verifier reviews on Regulator dashboard
  → On approval: BlueCreditMinting contract mints credits
  → Settlement contract queues payout
  → Fisher receives XLM via Stellar anchor
```

### Telemetry Flow
```
GPS device / SMS → POST /api/telemetry
  → BullMQ telemetry queue (concurrency: 50)
  → Stored in PostgreSQL telemetry table
  → FraudDetector checks implied speed vs last known position
  → Anomaly → compliance_score decremented on vessel
```

### SMS Offline Flow
```
Fisher sends SMS → Africa's Talking webhook → POST /api/sms/incoming
  → State machine: INIT → VESSEL_ID → SPECIES → WEIGHT → CONFIRM
  → On YES: catch inserted + queued for validation
  → Confirmation SMS sent back to fisher
```

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `contracts/vessel-registry` | Vessel identity, compliance scores, role management |
| `contracts/catch-verification` | Catch submission, duplicate guard, verifier approval |
| `contracts/blue-credit-minting` | Sustainability scoring, soulbound credit issuance |
| `contracts/settlement` | Payout queuing, batch execution via Stellar token |
| `contracts/esg-index` | Periodic ESG snapshots with Merkle proof |
| `backend/api-gateway` | REST API, queue workers, fraud detection, SMS gateway |
| `frontend/web` | Four role-based dashboards |
| `sdk` | TypeScript client library for all API surfaces |

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `fisher` | Submit catches, view own data, log telemetry |
| `vessel_owner` | Register vessels, submit catches |
| `verifier` | Approve/reject catches, mint credits, queue payouts |
| `esg_auditor` | Publish ESG snapshots |
| `admin` | All permissions |

## Security Design

- **JWT authentication** — Stellar wallet challenge/response (Ed25519 signature)
- **Rate limiting** — 200 req/min per IP on API gateway
- **Duplicate guard** — On-chain (Soroban temporary storage) + off-chain (DB window query)
- **Fraud detection** — GPS speed analysis, weight anomaly, vessel status check
- **Role enforcement** — Both on-chain (contract panics) and off-chain (middleware)
- **Audit trail** — All contract calls emit events; all API calls logged via pino
