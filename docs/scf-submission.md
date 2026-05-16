# SCF Build Award Submission — Sillage Bleu

**Track:** Open Track  
**Requested funding:** $120,000 in XLM  
**Timeline:** 4 months (testnet → mainnet)  
**License:** MIT (all contracts open-source)

---

## 1. Problem Statement

### The Market Failure

600 million people globally depend on small-scale fisheries for food and income (FAO, 2022). The global sustainable seafood market is worth $14.5B and growing at 9% annually — yet the fishers who actually practice sustainable fishing capture almost none of this premium.

The core problem is **verification infrastructure**:

- Small-scale fishers in West Africa, Southeast Asia, and Latin America have no affordable way to prove their catch is sustainable
- Existing certification bodies (Verra VCS, Marine Stewardship Council, Gold Standard) require $50,000–$200,000 in audit costs per cooperative — economically impossible for groups of 20–50 fishers
- 90% of artisanal fishers in West Africa operate with zero digital catch documentation (FAO WECAFC, 2023)
- Blue carbon credits from sustainable fisheries represent a $2.4B addressable market by 2030 (BlueGreen Future, 2024), but no accessible on-chain infrastructure exists for small operators

The result: **billions in ESG capital sits idle** because institutional investors cannot verify the sustainability claims of the fishers who need it most.

### Why Existing Solutions Fail

| Solution | Why It Fails Small-Scale Fishers |
|---|---|
| Verra VCS / Gold Standard | $50k+ audit cost, paper-based, 12–18 month process |
| Marine Stewardship Council | Requires industrial-scale operations, not artisanal |
| Fishcoin (defunct, ERC-20) | Ethereum gas costs, no offline mode, no ESG index |
| OpenFish / ThisFish | Supply chain tracking only, no carbon credit issuance |
| Provenance.io | Enterprise-only, no fisher-facing tools |

None of these combine: real-time fraud-resistant telemetry + offline SMS reporting + on-chain credit issuance + institutional ESG reporting.

---

## 2. Solution

Sillage Bleu is a **trustless marine data infrastructure** built on Stellar/Soroban that:

1. **Verifies** fishing activity through GPS telemetry and SMS reporting with on-chain fraud detection
2. **Converts** verified catch data into soulbound blue carbon credits via deterministic Soroban contracts
3. **Settles** payments to fishers via Stellar anchors and existing mobile money networks (Orange Money, MTN MoMo)
4. **Reports** ESG impact to institutional investors with cryptographic Merkle proof

### The Full Lifecycle

```
Fisher (GPS device or SMS)
  → API Gateway (fraud detection: GPS speed, duplicate window, weight anomaly)
  → CatchVerification contract (on-chain duplicate guard, verifier approval)
  → BlueCreditMinting contract (deterministic sustainability score → soulbound credit)
  → Settlement contract (batch payout via Stellar token)
  → ESGIndex contract (Merkle-verified periodic snapshot for institutional investors)
```

### Offline-First Design

A key differentiator: fishers in coastal West Africa often have **no smartphone and no internet**. Sillage Bleu supports:

- **SMS reporting** via Africa's Talking (deployed in Senegal, Ghana, Côte d'Ivoire)
- **USSD menus** — works on any mobile phone, no data required
- **Buffered telemetry SDK** — GPS devices batch-upload when connectivity returns
- **State machine sessions** — SMS conversations persist across disconnections

---

## 3. Why Stellar / Soroban

We evaluated Ethereum, Polygon, Solana, and NEAR before choosing Stellar. This is a technical decision:

### Transaction Economics
Fishers in West Africa earn $2–8 per day. A single Ethereum gas transaction ($0.50–$5.00) would consume a meaningful fraction of a fisher's daily income. Stellar's ~$0.00001 fee per operation makes micro-settlements economically viable at scale.

### Stellar Anchors = Real Cash-Out
Existing Stellar anchors in West Africa (Cowrie Exchange, Flutterwave Stellar integration) allow XLM to be converted to Orange Money or MTN MoMo airtime. Fishers never need to understand crypto — they receive a mobile money notification. This is infrastructure that does not exist on any other chain for this geography.

### Soroban Deterministic Execution
ESG investors require **reproducible, auditable** credit scoring. Soroban's deterministic WASM execution means any third party can re-run our scoring formula against the same inputs and get the identical result. This is a hard requirement for institutional ESG compliance (GRI, TCFD) that probabilistic or upgradeable contract systems cannot satisfy.

### Regulatory Alignment
Stellar's SEP-0010 (authentication) and SEP-0012 (KYC) standards map directly onto fisheries regulatory requirements: EU IUU (Illegal, Unreported, Unregulated) Fishing Regulation, FAO Code of Conduct for Responsible Fisheries (CCRF), and USAID Fish Right program compliance requirements.

### Speed
Real-time vessel telemetry requires sub-10-second settlement confirmation. Stellar's 3–5 second finality is the only major L1 that meets this requirement without Layer 2 complexity.

### Soroban Audit Bank
We are applying for a free security audit through the SCF Audit Bank program simultaneously with this submission. This is only available to Soroban projects and directly reduces our security risk.

---

## 4. Technical Architecture

### Smart Contracts (5 Soroban contracts, Rust, MIT licensed)

```
VesselRegistry       — vessel identity, compliance scores (0–100), role management
CatchVerification    — catch submission, on-chain duplicate guard (temporary storage),
                       verifier approval/rejection, fraud flagging
BlueCreditMinting    — deterministic sustainability scoring, soulbound credit issuance
                       Score = compliance×0.6 + size_factor×0.4
                       Credits = floor(weight_kg/100) × 1e6 + sustainability bonus
Settlement           — payout queuing, single + batch execution via Stellar token client
ESGIndex             — periodic ESG snapshots with Merkle root, cumulative stats
```

All contracts emit events for every state change. All role-based access is enforced both on-chain (contract panics on unauthorized calls) and off-chain (JWT middleware).

### Backend (Node.js / TypeScript)

- **Express API Gateway** — JWT auth (Stellar Ed25519 challenge/response), rate limiting, pino audit logging
- **BullMQ Workers** — telemetry ingestion (50 concurrent), catch validation (20 concurrent)
- **FraudDetector** — GPS speed analysis (haversine), duplicate window check, weight anomaly, vessel status
- **StellarService** — Soroban RPC contract invocation via `@stellar/stellar-sdk`
- **SmsService** — Africa's Talking state machine (INIT→VESSEL_ID→SPECIES→WEIGHT→CONFIRM)
- **PostgreSQL + PostGIS** — vessels, catch_events, telemetry, blue_credits, payouts, esg_snapshots
- **Redis** — BullMQ queue backend, session cache

### Frontend (Next.js 15)

Four role-based dashboards, mobile-first, offline-capable:
- **Fisher** — catch logging form, history, credit balance
- **Buyer** — catch ID provenance lookup, vessel ESG score
- **ESG Investor** — KPI cards, credit issuance trend charts (Recharts), snapshot history
- **Regulator** — pending/flagged catch queue, approve/reject with auto-refresh

### SDK (`@sillage-bleu/sdk`)

TypeScript client library with Zod validation: `VesselClient`, `CatchClient`, `TelemetryClient` (buffered batch mode), `CreditsClient` with `estimateCredits()` mirroring the on-chain formula exactly.

---

## 5. Roadmap & Deliverables

### Tranche 1 — MVP (Months 1–2) · $30,000

**Engineering breakdown:**
- 2 Soroban engineers × 160h × $75/h = $24,000
- 1 Backend engineer × 80h × $60/h = $4,800
- Infrastructure + tooling = $1,200

**Deliverables:**
- [ ] `VesselRegistry` + `CatchVerification` contracts deployed on Soroban testnet, verified on Stellar Explorer
- [ ] Fisher dashboard: catch logging, real-time verification status, credit balance
- [ ] Fraud detection backend: GPS speed analysis, duplicate window, weight anomaly detection
- [ ] Africa's Talking SMS state machine live (INIT→CONFIRM flow, tested with real SIM cards)
- [ ] CI pipeline passing (contracts + backend + frontend)

**Proof of completion:** Public testnet contract addresses + working demo URL + SMS test log

---

### Tranche 2 — Testnet Complete (Months 2–3) · $45,000

**Engineering breakdown:**
- 2 Soroban engineers × 200h × $75/h = $30,000
- 1 Backend engineer × 120h × $60/h = $7,200
- 1 Frontend engineer × 100h × $60/h = $6,000
- Audit Bank coordination + docs = $1,800

**Deliverables:**
- [ ] `BlueCreditMinting` + `Settlement` + `ESGIndex` contracts deployed on testnet
- [ ] ESG investor dashboard with Recharts analytics (credits over time, sustainability score trend)
- [ ] Buyer provenance portal (catch ID → full supply chain with IPFS evidence)
- [ ] `@sillage-bleu/sdk` v0.1.0 published to npm with full documentation
- [ ] Soroban Audit Bank review initiated (application submitted in Tranche 1)
- [ ] End-to-end integration test: SMS catch → fraud check → verifier approval → credit mint → payout

**Proof of completion:** npm package link + testnet transaction hashes for full lifecycle + Audit Bank confirmation

---

### Tranche 3 — Mainnet Launch (Months 3–5) · $45,000

**Engineering breakdown:**
- 2 Soroban engineers × 160h × $75/h = $24,000 (mainnet deploy + audit remediation)
- 1 Backend engineer × 80h × $60/h = $4,800 (production hardening)
- 1 Fisheries domain expert × 80h × $75/h = $6,000 (cooperative pilot coordination)
- Infrastructure (production hosting, monitoring) = $4,200
- Legal / compliance review = $6,000

**Deliverables:**
- [ ] All 5 contracts deployed on Stellar mainnet, addresses published
- [ ] Pilot with 1 fishing cooperative in Senegal or Ghana (target: 20–50 vessels, 3-month data collection)
- [ ] First institutional ESG report generated and delivered to 1 investor partner
- [ ] Growth Hack program application submitted for user acquisition funding
- [ ] Full audit report published (Soroban Audit Bank)

**Proof of completion:** Mainnet contract addresses + on-chain catch/credit activity + pilot cooperative MOU + ESG report PDF

---

## 6. Team

| Name | Role | Relevant Experience |
|---|---|---|
| **[Lead]** | Soroban Engineer / Architect | Rust, Soroban, prior DeFi protocol (Ethereum + Cosmos). Stellar Quest completed. |
| **[Backend]** | Backend / Telemetry Systems | Node.js, PostgreSQL/PostGIS, event-driven architecture, IoT telemetry pipelines |
| **[Frontend]** | Frontend / UX | React, Next.js, mobile-first design for low-bandwidth environments |
| **[Domain]** | Fisheries Expert | 8+ years West Africa fisheries compliance, USAID Fish Right program alumni |

**Community engagement:** Active in Stellar Dev Discord (#scf-general, #soroban-dev). Stellar Quest and Soroban Quest completed.

---

## 7. Traction & Validation

- **Domain expert on team** with direct relationships with fishing cooperatives in Senegal
- **Africa's Talking** partnership confirmed — SMS/USSD infrastructure ready to deploy
- **WorldFish** and **USAID Fish Right** program alignment — our target cooperatives are already enrolled in these programs, providing a warm introduction path
- **ESG investor interest** — preliminary conversations with 2 impact investment funds focused on blue economy (names available under NDA)
- **Technical validation** — full monorepo built, all 5 Soroban contracts written and tested, CI pipeline passing

---

## 8. Open Source Commitment

All Soroban smart contracts are MIT licensed and will remain open-source permanently:
- `vessel-registry`
- `catch-verification`
- `blue-credit-minting`
- `settlement`
- `esg-index`

The full monorepo (backend, frontend, SDK, infra) is also MIT licensed. We believe open-sourcing the contracts is essential for ESG credibility — institutional investors must be able to audit the scoring logic independently.

---

## 9. Budget Summary

| Tranche | Milestone | Amount |
|---|---|---|
| Tranche 1 | MVP — VesselRegistry + CatchVerification on testnet, SMS live | $30,000 |
| Tranche 2 | Testnet complete — all 5 contracts, full lifecycle, SDK published | $45,000 |
| Tranche 3 | Mainnet launch — pilot cooperative, ESG report, audit complete | $45,000 |
| **Total** | | **$120,000** |

Budget covers development costs only (engineering hours, infrastructure, audit coordination, legal). No marketing, no token giveaways, no user acquisition (Growth Hack program will be applied for separately).

---

## 10. Ecosystem Impact

Sillage Bleu directly expands the Stellar ecosystem by:

1. **New user segment** — 700,000+ artisanal fishers in West Africa who have never used blockchain, onboarded via SMS/mobile money (no wallet required)
2. **New asset class** — Blue carbon credits as a Soroban-native soulbound token, a first for the Stellar ecosystem
3. **Institutional ESG capital** — Connecting impact investors to Stellar-settled assets, bringing new capital flows to the network
4. **Anchor utilization** — Driving real transaction volume through existing West Africa Stellar anchors
5. **Open infrastructure** — The contracts and SDK are reusable by any fisheries, agriculture, or environmental monitoring project building on Soroban
