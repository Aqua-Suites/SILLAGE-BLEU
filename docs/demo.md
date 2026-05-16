# Demo Guide — Sillage Bleu

This document walks through the four role-based dashboards and the key user flows of the Sillage Bleu platform.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Fisher (GPS / SMS)  Buyer (web)  ESG Investor  Regulator      │
└────────────┬──────────────┬──────────────┬──────────┬──────────┘
             ▼              ▼              ▼          ▼
        Next.js 15 — /fisher  /buyer  /esg  /regulator
             │
        Express API Gateway (JWT auth · rate limiting · audit log)
             │
    ┌────────┴────────┐
    │  BullMQ Workers │ ← telemetry (×50) · catch validation (×20)
    └────────┬────────┘
             │
    PostgreSQL (PostGIS) + Redis
             │
    Soroban RPC → 5 contracts on Stellar Testnet
```

---

## Flow 1: Fisher Dashboard (`/fisher`)

The fisher dashboard is designed for low-bandwidth environments (2G, 320px screens).

### Catch Submission (Web)
1. Fisher connects Freighter wallet (or uses SMS — see Flow 5)
2. Fills catch form: vessel ID, species, weight (kg), GPS coordinates auto-populated
3. Submits → catch enters `pending` state in PostgreSQL
4. BullMQ catch-validation worker runs `FraudDetector`:
   - GPS speed check against last known position
   - Duplicate window check (24h)
   - Weight anomaly check (>5,000 kg flagged)
5. Clean catches are submitted to `CatchVerification` Soroban contract
6. Fisher sees real-time status: `pending → submitted → approved/rejected`
7. On approval: `BlueCreditMinting` mints soulbound credits, `Settlement` queues XLM payout

### Credit Balance
- Fisher sees total blue credits earned (micro-credits, 1e6 = 1 credit)
- Sustainability score per catch (0–100)
- Payout history with Stellar transaction links

---

## Flow 2: Regulator Dashboard (`/regulator`)

The regulator dashboard is the verification queue — the human-in-the-loop for catch approval.

### Catch Review Queue
1. Regulator sees all `pending` and `flagged` catches in real-time (auto-refresh every 30s)
2. Each catch shows: vessel ID, fisher address, species, weight, GPS coordinates, timestamp, fraud flags
3. Regulator clicks **Approve** → calls `CatchVerification.verify_catch(approved: true)` on-chain
4. Regulator clicks **Reject** → calls `CatchVerification.verify_catch(approved: false)` on-chain
5. Regulator clicks **Flag** → calls `CatchVerification.flag_catch()` for further investigation

### Fraud Flag Indicators
| Flag | Meaning |
|---|---|
| `duplicate_window` | Same vessel submitted within 24h |
| `excessive_weight` | Weight > 5,000 kg |
| `invalid_gps` | Coordinates outside valid range |
| `vessel_not_active` | Vessel is suspended or deregistered |

---

## Flow 3: ESG Investor Dashboard (`/esg`)

The ESG investor dashboard provides cryptographically verifiable impact metrics.

### KPI Cards
- **Total verified catch** (kg) — cumulative across all approved catches
- **Blue credits issued** — total micro-credits minted on-chain
- **Active vessels** — vessels with at least one approved catch in the period
- **Average sustainability score** — weighted average across all credits

### Charts (Recharts)
- **Credits issued over time** — weekly bar chart
- **Sustainability score trend** — line chart showing ecosystem health
- **Species breakdown** — pie chart of verified catch by species

### ESG Snapshot Verification
Each periodic snapshot stored in `ESGIndex` includes a **Merkle root** of the underlying catch data. Any third party can:
1. Download the raw catch data from the API
2. Recompute the Merkle root
3. Compare against the on-chain value in `ESGIndex`

This provides cryptographic proof that the ESG metrics have not been tampered with — a hard requirement for GRI/TCFD institutional reporting.

---

## Flow 4: Buyer Dashboard (`/buyer`)

The buyer dashboard enables seafood buyers to verify provenance before purchase.

### Catch Provenance Lookup
1. Buyer enters a catch ID (printed on packaging QR code)
2. System returns full provenance chain:
   - Vessel registration details (name, flag state, IMO number)
   - Vessel compliance score at time of catch
   - Catch details (species, weight, GPS location, timestamp)
   - Verification status and verifier address
   - Blue credits issued for this catch
   - IPFS evidence link (photos/documents if provided)
3. All data is cross-referenced with on-chain contract state — cannot be forged

---

## Flow 5: SMS Offline Catch Submission

For fishers with no smartphone or internet access. Works on any mobile phone via SMS.

```
Fisher SMS → "CATCH"
System     → "Welcome to Sillage Bleu. Enter your vessel ID:"

Fisher SMS → "VESSEL001"
System     → "Vessel: Blue Horizon (SN). Enter species caught:"

Fisher SMS → "Yellowfin Tuna"
System     → "Enter weight in kg:"

Fisher SMS → "450"
System     → "Confirm: VESSEL001 / Yellowfin Tuna / 450kg? Reply YES or NO"

Fisher SMS → "YES"
System     → "Catch submitted. ID: C-20260516-001. Payout on approval. Reply CATCH for new submission."
```

The SMS state machine is implemented in `backend/api-gateway/src/services/smsService.ts` using Africa's Talking. Sessions persist across disconnections — if a fisher loses signal mid-flow, they can resume from where they left off.

---

## Flow 6: Telemetry (GPS Vessel Tracking)

For vessels equipped with GPS devices:

1. GPS device sends `POST /api/telemetry` every 5 minutes with lat/lon/speed
2. BullMQ telemetry worker (50 concurrent) processes each ping:
   - Stores in PostgreSQL `telemetry` table with PostGIS geometry
   - Runs `FraudDetector.checkTelemetry()` — haversine speed check
   - Anomalous speed → compliance score decremented on `VesselRegistry`
3. Telemetry history is visible on the Fisher dashboard as a track map
4. GPS coordinates from the last telemetry ping are auto-populated in the catch submission form

---

## Contract Interaction Examples

See [docs/contract-examples.md](contract-examples.md) for Stellar CLI and SDK examples.

### SDK Quick Example

```typescript
import { CatchClient, CreditsClient } from '@sillage-bleu/sdk';

const catchClient = new CatchClient({ apiUrl: 'https://api.sillagebleu.io', authToken });

// Submit a catch
const catch = await catchClient.submit({
  vesselId: 'VESSEL001',
  species: 'Yellowfin Tuna',
  weightKg: 450,
  latitude: 14.692,
  longitude: -17.447,
});

// Estimate credits before minting
const creditsClient = new CreditsClient({ apiUrl: 'https://api.sillagebleu.io' });
const estimated = creditsClient.estimateCredits(450, 78); // → 6_750_000 micro-credits
```

---

## Running Locally

```bash
cp .env.example .env
npm run infra:up          # start postgres + redis
npm install
npm run contracts:build   # build Soroban contracts
npm run contracts:test    # run contract tests
cd backend/api-gateway && npm run dev   # :3001
cd frontend/web && npm run dev          # :3000
```

See [docs/developer-onboarding.md](developer-onboarding.md) for full setup including Soroban CLI installation.
