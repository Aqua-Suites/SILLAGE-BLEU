# SCF Build Award Submission — Sillage Bleu

**Track:** Open Track  
**Requested funding:** $120,000 in XLM  
**Timeline:** 4 months (testnet → mainnet)  
**License:** MIT (all contracts open-source)  
**Repository:** https://github.com/Aqua-Suites/SILLAGE-BLEU

---

## 1. Problem Statement

### The Market Failure

600 million people globally depend on small-scale fisheries for food and income (FAO, 2022). The global sustainable seafood market is worth $14.5B and growing at 9% annually — yet the fishers who actually practice sustainable fishing capture almost none of this premium.

The core problem is **verification infrastructure**:

- Small-scale fishers in West Africa have no affordable way to prove their catch is sustainable
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
Existing Stellar anchors in West Africa (Cowrie Exchange, Flutterwave Stellar integration) allow XLM to be converted to Orange Money or MTN MoMo airtime. Fishers never need to understand crypto — they receive a mobile money notification. This infrastructure does not exist on any other chain for this geography.

### Soroban Deterministic Execution
ESG investors require **reproducible, auditable** credit scoring. Soroban's deterministic WASM execution means any third party can re-run our scoring formula against the same inputs and get the identical result. This is a hard requirement for institutional ESG compliance (GRI, TCFD) that probabilistic or upgradeable contract systems cannot satisfy.

### Regulatory Alignment
Stellar's SEP-0010 (authentication) and SEP-0012 (KYC) standards map directly onto fisheries regulatory requirements: EU IUU Fishing Regulation, FAO Code of Conduct for Responsible Fisheries (CCRF), and USAID Fish Right program compliance requirements.

### Speed
Real-time vessel telemetry requires sub-10-second settlement confirmation. Stellar's 3–5 second finality is the only major L1 that meets this requirement without Layer 2 complexity.

### Soroban Audit Bank
We are applying for a free security audit through the SCF Audit Bank program simultaneously with this submission. This is only available to Soroban projects and directly reduces our security risk.

---

## 4. Technical Architecture

### Smart Contracts (5 Soroban contracts, Rust, MIT licensed)

All 5 contracts are fully written, tested, and CI-verified. The repository CI badge is green: https://github.com/Aqua-Suites/SILLAGE-BLEU/actions

```
VesselRegistry       — vessel identity, compliance scores (0–100), role management
CatchVerification    — catch submission, on-chain duplicate guard (Soroban temporary storage),
                       verifier approval/rejection, fraud flagging
BlueCreditMinting    — deterministic sustainability scoring, soulbound credit issuance
                       Score = compliance×0.6 + size_factor×0.4
                       Credits = floor(weight_kg/100) × 1e6 + sustainability bonus
Settlement           — payout queuing, single + batch execution via Stellar token client
ESGIndex             — periodic ESG snapshots with Merkle root, cumulative stats
```

All contracts emit events for every state change. All role-based access is enforced both on-chain (contract panics on unauthorized calls) and off-chain (JWT middleware). Full test suite passes on CI.

**Testnet deployment:** All 5 contracts will be deployed to Stellar Testnet within 48 hours of award notification. Contract addresses will be published in the README and verifiable on [Stellar Expert](https://stellar.expert/explorer/testnet). The Tranche 1 proof of completion will include the specific testnet transaction hashes for each deployment.

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

## 5. Traction & Validation

### Domain Expertise
**Ibrahima Sow** (team fisheries expert) has 8+ years of West Africa fisheries compliance experience and is a USAID Fish Right program alumni. He has direct working relationships with fishing cooperatives in Dakar (Senegal) and Tema (Ghana), providing a warm introduction path to our pilot cooperative targets.

### Partner Alignment
- **Africa's Talking** — SMS/USSD infrastructure confirmed available in Senegal, Ghana, and Côte d'Ivoire. API integration is already implemented in the codebase (`backend/api-gateway/src/services/smsService.ts`).
- **USAID Fish Right program** — Our target cooperatives in Senegal and Ghana are already enrolled in this program, which focuses on fisheries data modernization. This gives us a credible entry point without cold outreach.
- **WorldFish** — Active in our target regions with existing fisher relationships. We are in contact with their West Africa office regarding data-sharing for pilot validation.

### ESG Investor Interest
Two impact investment funds focused on the blue economy have expressed preliminary interest in receiving ESG reports generated by the platform (names available under NDA upon request). This validates the demand side of the marketplace.

### Technical Validation
- Full monorepo built and CI-passing: 5 Soroban contracts, Express backend, Next.js frontend, TypeScript SDK
- All contract tests pass (vessel registration, catch verification, credit minting, settlement, ESG snapshots)
- Fraud detection logic tested with real GPS coordinate scenarios
- SMS state machine implemented and unit-tested

---

## 6. Roadmap & Deliverables

### Tranche 1 — MVP (Months 1–2) · $30,000

**Engineering breakdown:**
- Daniel Omoloba (Soroban): 160h × $75/h = $12,000
- Kwame Asante (Backend): 80h × $60/h = $4,800
- Aminata Diallo (Frontend): 80h × $60/h = $4,800
- Ibrahima Sow (Domain/Coordination): 40h × $50/h = $2,000
- Infrastructure (hosting, SMS credits, tooling): $1,400
- Contingency (10%): $5,000

**Deliverables:**
- [ ] `VesselRegistry` + `CatchVerification` deployed on Soroban testnet — **verifiable contract addresses published in README**
- [ ] Fisher dashboard: catch logging, real-time verification status, credit balance
- [ ] Fraud detection backend: GPS speed analysis, duplicate window, weight anomaly detection
- [ ] Africa's Talking SMS state machine live (INIT→CONFIRM flow, tested with real SIM cards in Senegal)
- [ ] CI pipeline passing (contracts + backend + frontend + SDK)

**Proof of completion:** Testnet contract addresses + Stellar Expert transaction links + working demo URL + SMS test log with real phone number

---

### Tranche 2 — Testnet Complete (Months 2–3) · $45,000

**Engineering breakdown:**
- Daniel Omoloba (Soroban): 200h × $75/h = $15,000
- Kwame Asante (Backend): 120h × $60/h = $7,200
- Aminata Diallo (Frontend): 100h × $60/h = $6,000
- Ibrahima Sow (Pilot coordination): 80h × $50/h = $4,000
- Audit Bank coordination + security review: $5,000
- Infrastructure + npm publishing: $2,800
- Contingency (10%): $5,000

**Deliverables:**
- [ ] `BlueCreditMinting` + `Settlement` + `ESGIndex` contracts deployed on testnet — **all 5 contract addresses published**
- [ ] ESG investor dashboard with Recharts analytics (credits over time, sustainability score trend)
- [ ] Buyer provenance portal (catch ID → full supply chain with IPFS evidence)
- [ ] `@sillage-bleu/sdk` v0.1.0 published to npm with full documentation
- [ ] Soroban Audit Bank review initiated
- [ ] End-to-end integration test: SMS catch → fraud check → verifier approval → credit mint → payout — **full transaction hash chain published**

**Proof of completion:** npm package link + testnet transaction hashes for full lifecycle + Audit Bank confirmation email

---

### Tranche 3 — Mainnet Launch (Months 3–5) · $45,000

**Engineering breakdown:**
- Daniel Omoloba (Soroban mainnet + audit remediation): 160h × $75/h = $12,000
- Kwame Asante (Production hardening): 80h × $60/h = $4,800
- Ibrahima Sow (Cooperative pilot): 80h × $50/h = $4,000
- Production infrastructure (hosting, monitoring, CDN): $4,200
- Legal / compliance review (EU IUU, GDPR): $6,000
- Audit remediation reserve: $9,000
- Contingency (10%): $5,000

**Deliverables:**
- [ ] All 5 contracts deployed on Stellar mainnet — **addresses published and verifiable**
- [ ] Pilot with 1 fishing cooperative in Senegal or Ghana (target: 20–50 vessels, 3-month data collection)
- [ ] First institutional ESG report generated and delivered to 1 investor partner
- [ ] Growth Hack program application submitted
- [ ] Full audit report published (Soroban Audit Bank)

**Proof of completion:** Mainnet contract addresses + on-chain catch/credit activity + pilot cooperative MOU + ESG report PDF

---

## 7. Team

| Name | Role | Background |
|---|---|---|
| **Daniel Omoloba** ([@danielomoloba](https://github.com/danielomoloba)) | Lead Architect / Soroban Engineer | Rust, Soroban, prior DeFi protocol work on Ethereum + Cosmos. **Stellar Quest ✅ Soroban Quest ✅** Active in `#soroban-dev` Discord. |
| **Kwame Asante** ([@kwameasante-dev](https://github.com/kwameasante-dev)) | Backend / Telemetry Systems | Node.js, PostgreSQL/PostGIS, IoT telemetry pipelines, event-driven architecture. 6 years backend engineering. |
| **Aminata Diallo** ([@aminatadiallo](https://github.com/aminatadiallo)) | Frontend / UX | React, Next.js, mobile-first design for low-bandwidth environments. Specializes in accessibility for emerging markets. |
| **Ibrahima Sow** | Fisheries Domain Expert | 8+ years West Africa fisheries compliance; USAID Fish Right program alumni; direct relationships with cooperatives in Senegal and Ghana. Speaks Wolof, French, English. |

**Why this team is uniquely qualified:**
- The only team combining Soroban engineering depth with on-the-ground West Africa fisheries relationships
- Ibrahima Sow's cooperative contacts eliminate the cold-start problem for the pilot
- Daniel's prior cross-chain DeFi experience means the Stellar/Soroban architecture decisions are informed, not arbitrary
- Aminata's low-bandwidth UX experience is essential — our users have 2G connections and feature phones

---

## 8. Open Source Commitment

All Soroban smart contracts are MIT licensed and will remain open-source permanently. The full monorepo (backend, frontend, SDK, infra) is also MIT licensed.

We believe open-sourcing the contracts is essential for ESG credibility — institutional investors must be able to audit the scoring logic independently. The deterministic scoring formula is documented in [docs/blue-credit-methodology.md](blue-credit-methodology.md) and mirrored exactly in the TypeScript SDK's `estimateCredits()` function.

---

## 9. Budget Summary

| Tranche | Milestone | Amount |
|---|---|---|
| Tranche 1 | MVP — VesselRegistry + CatchVerification on testnet, SMS live | $30,000 |
| Tranche 2 | Testnet complete — all 5 contracts, full lifecycle, SDK published | $45,000 |
| Tranche 3 | Mainnet launch — pilot cooperative, ESG report, audit complete | $45,000 |
| **Total** | | **$120,000** |

**Why $120,000:** This covers 4 months of work for a 4-person team at West Africa market rates ($50–75/h for senior engineers, $50/h for domain expert), plus infrastructure, audit coordination, and legal compliance. We are not requesting the maximum arbitrarily — the budget is itemized per tranche above. No marketing spend is included; user acquisition will be applied for separately via the Growth Hack program.

---

## 10. Ecosystem Impact

Sillage Bleu directly expands the Stellar ecosystem by:

1. **New user segment** — 700,000+ artisanal fishers in West Africa who have never used blockchain, onboarded via SMS/mobile money (no wallet required)
2. **New asset class** — Blue carbon credits as a Soroban-native soulbound token, a first for the Stellar ecosystem
3. **Institutional ESG capital** — Connecting impact investors to Stellar-settled assets, bringing new capital flows to the network
4. **Anchor utilization** — Driving real transaction volume through existing West Africa Stellar anchors (Cowrie, Flutterwave)
5. **Open infrastructure** — The contracts and SDK are reusable by any fisheries, agriculture, or environmental monitoring project building on Soroban
6. **Regulatory precedent** — Demonstrating Stellar's viability for EU IUU compliance creates a template for other regulated industries

---

## 11. Security & Audit Plan

See [docs/threat-model.md](threat-model.md) for a full threat analysis.

Key security properties:
- Role-based access enforced on every state-changing contract function
- On-chain duplicate guard using Soroban temporary storage (cannot be replayed)
- No upgradeable proxy patterns — contracts are immutable after deployment
- All arithmetic uses Rust's overflow-checked integer types
- JWT authentication uses Stellar Ed25519 challenge/response (no password storage)

**Soroban Audit Bank application** will be submitted simultaneously with this SCF submission. We are targeting a Tranche 2 audit completion.
