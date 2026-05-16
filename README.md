# 🌊 Sillage Bleu

[![CI](https://github.com/your-org/sillage-bleu/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/sillage-bleu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-black?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-purple)](https://soroban.stellar.org)

**Blue Economy Verification & Ocean Carbon Credit Infrastructure**  
*Stellar ESG + DePIN System — SCF Build Award Submission*

Sillage Bleu is a decentralized marine sustainability platform that enables small-scale fishers to prove sustainable catch practices, unlock premium seafood markets, and issue verifiable blue carbon credits on Stellar/Soroban.

---

## 🌍 The Problem — Market Validation

**600 million people** globally depend on small-scale fisheries for food and income (FAO, 2022). Yet:

- **$11B+** in sustainable seafood premiums go uncaptured annually because small-scale fishers cannot prove sustainability claims (World Bank Blue Economy Report, 2023)
- **90% of artisanal fishers** in West Africa operate without any digital catch documentation (FAO WECAFC, 2023)
- **Blue carbon credits** from sustainable fisheries are a $2.4B addressable market by 2030 (BlueGreen Future, 2024), but no accessible on-chain infrastructure exists for small operators
- Existing solutions (Verra VCS, Gold Standard) require $50,000+ in audit costs — completely inaccessible to cooperatives of 20–50 fishers

**The result:** Billions in ESG capital cannot reach the fishers who need it most, because there is no trustless, low-cost, offline-capable verification infrastructure.

### Target Regions (Pilot)
West Africa — **Senegal, Ghana, Côte d'Ivoire** — chosen because:
- Combined 700,000+ registered artisanal fishers
- Existing mobile money penetration (Orange Money, MTN MoMo) enables Stellar anchor cash-out
- Active fisheries compliance modernization programs (USAID Fish Right, WorldFish)
- Africa's Talking SMS/USSD infrastructure already deployed in all three countries

---

## 💡 The Solution

Sillage Bleu is a **trustless marine data infrastructure** that transforms fishing activity into verified sustainability assets and tradable blue carbon credits — accessible to fishers with no smartphone, no internet, and no crypto knowledge.

```
Fisher (GPS / SMS) → Fraud Detection → Soroban Verification → Blue Credits → Stellar Payout
                                                                      ↓
                                              ESG Investor Dashboard (Merkle-verified)
```

### What Makes This Unique

| Competitor | Gap | Sillage Bleu |
|---|---|---|
| Verra VCS / Gold Standard | Centralized, $50k+ audit cost, paper-based | Trustless, on-chain, $0 audit cost for fishers |
| Fishcoin (defunct) | ERC-20, no offline mode, no ESG index | Soroban soulbound credits, SMS/USSD, Merkle ESG proof |
| OpenFish / ThisFish | Supply chain only, no carbon credits | Full lifecycle: catch → credit → payout |
| Provenance.io | Enterprise-only, no fisher tools | Fisher-first, mobile-optimized, SMS fallback |

**Sillage Bleu is the only system combining:** real-time GPS fraud detection + SMS/USSD offline reporting + soulbound Soroban credits + Stellar anchor settlement + cryptographic ESG indexing.

---

## 🔵 Why Stellar / Soroban

We evaluated Ethereum, Polygon, and Solana before choosing Stellar. The decision is technical, not arbitrary:

1. **Transaction cost** — Ethereum gas makes $0.50 micro-settlements for individual catches economically impossible. Stellar's ~$0.00001 fee per operation is the only viable option for high-frequency, low-value fisheries data.

2. **Stellar Anchors** — Existing XLM↔mobile money anchors in West Africa (Cowrie, Flutterwave integrations) allow fishers to receive XLM and cash out via Orange Money or MTN MoMo without ever touching a crypto wallet.

3. **Soroban deterministic execution** — ESG investors require reproducible, auditable credit scoring. Soroban's deterministic WASM execution means any third party can re-run the scoring formula and get the same result — essential for institutional ESG compliance.

4. **SEP-0010 / SEP-0012** — Stellar's built-in auth and KYC standards align directly with fisheries regulatory requirements (EU IUU Regulation, FAO CCRF).

5. **3–5 second finality** — Real-time telemetry settlement requires sub-10-second confirmation. Ethereum's 12s+ average is too slow for vessel tracking use cases.

6. **Soroban Audit Bank** — We are applying for a free security audit through the SCF Audit Bank program, which is only available to Soroban projects.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Fisher (GPS/SMS)  Buyer (web)  ESG Investor  Regulator        │
└────────────┬──────────────┬──────────────┬──────────┬──────────┘
             ▼              ▼              ▼          ▼
        Next.js 15 — /fisher  /buyer  /esg  /regulator
             │
        Express API Gateway (JWT auth · rate limiting · audit log)
             │
    ┌────────┴────────┐
    │  BullMQ Workers │ ← telemetry (×50 concurrency) · catch validation
    └────────┬────────┘
             │
    PostgreSQL (PostGIS) + Redis
             │
    Soroban RPC → 5 contracts on Stellar
```

See [docs/architecture.md](docs/architecture.md) for full diagram and data flows.

---

## 📦 Smart Contracts (Soroban)

All contracts are open-source under MIT. Audit Bank application submitted alongside this SCF submission.

| Contract | Purpose | Key Design |
|---|---|---|
| `VesselRegistry` | Vessel identity, compliance scores | Role-based, compliance score 0–100 |
| `CatchVerification` | Catch submission, fraud guard | On-chain duplicate guard (temporary storage) |
| `BlueCreditMinting` | Soulbound credit issuance | Deterministic scoring: compliance×0.6 + size×0.4 |
| `Settlement` | Fisher payouts, batch execution | Stellar token client, batch for gas efficiency |
| `ESGIndex` | Periodic ESG snapshots | Merkle root proof, cumulative stats |

---

## 🗺 Development Roadmap

### Tranche 1 — MVP (Months 1–2) · $30,000
- [ ] VesselRegistry + CatchVerification deployed on Soroban testnet
- [ ] Fisher dashboard: catch logging + real-time status
- [ ] Fraud detection backend: GPS speed analysis, duplicate window, weight anomaly
- [ ] Africa's Talking SMS state machine live (INIT→CONFIRM flow)
- **Deliverable:** Working testnet demo with 5+ test vessels, SMS catch submission end-to-end

### Tranche 2 — Testnet Complete (Months 2–3) · $45,000
- [ ] BlueCreditMinting + Settlement + ESGIndex contracts deployed
- [ ] ESG investor dashboard with Recharts analytics
- [ ] Buyer provenance portal (catch ID → full supply chain)
- [ ] `@sillage-bleu/sdk` published to npm
- [ ] Soroban Audit Bank review completed
- **Deliverable:** Full catch→credit→payout lifecycle on testnet; SDK with docs

### Tranche 3 — Mainnet Launch (Months 3–5) · $45,000
- [ ] Mainnet deployment (all 5 contracts)
- [ ] Pilot with 1 fishing cooperative in Senegal or Ghana (target: 20–50 vessels)
- [ ] ESG report generation for 1 institutional investor
- [ ] Growth Hack program application for user acquisition
- **Deliverable:** Live on Stellar mainnet with verifiable on-chain catch and credit activity

**Total requested: $120,000 in XLM**

---

## 🚀 Quick Start

```bash
cp .env.example .env          # configure environment
npm run infra:up               # start postgres + redis
npm install                    # install JS dependencies
npm run contracts:build        # build Soroban contracts
npm run contracts:test         # run contract tests
cd backend/api-gateway && npm run dev
cd frontend/web && npm run dev
```

See [docs/developer-onboarding.md](docs/developer-onboarding.md) for full setup.

---

## 📁 Repository Structure

```
sillage-bleu/
├── contracts/          # Soroban smart contracts (Rust) — MIT licensed
│   ├── shared/         # Common types: Vessel, CatchEvent, BlueCredit, EsgSnapshot
│   ├── vessel-registry/
│   ├── catch-verification/
│   ├── blue-credit-minting/
│   ├── settlement/
│   └── esg-index/
├── backend/api-gateway/ # Express API + BullMQ workers (Node.js/TypeScript)
├── frontend/web/        # Next.js 15 — 4 role-based dashboards
├── sdk/                 # @sillage-bleu/sdk TypeScript client
├── infra/               # Docker Compose, CI/CD, Dockerfiles
└── docs/                # Architecture, onboarding, ESG compliance, SMS guide
```

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design, data flows, security model |
| [Developer Onboarding](docs/developer-onboarding.md) | Setup, project structure, env vars |
| [Vessel Onboarding](docs/vessel-onboarding.md) | Register vessels, log catches, telemetry setup |
| [Contract Examples](docs/contract-examples.md) | Stellar CLI + SDK interaction examples |
| [Blue Credit Methodology](docs/blue-credit-methodology.md) | Deterministic scoring formula with examples |
| [SMS/USSD Guide](docs/sms-guide.md) | Offline reporting for fishers (no smartphone needed) |
| [ESG Compliance](docs/esg-compliance.md) | GRI/TCFD/SDG14 alignment, audit trail, Merkle proof |
| [SCF Submission](docs/scf-submission.md) | Full SCF Build Award narrative |

---

## 👥 Team

| Name | Role | Background |
|---|---|---|
| **[Your Name]** | Lead Architect / Soroban Engineer | Rust, Soroban, prior DeFi protocol work |
| **[Team Member 2]** | Backend / Telemetry Systems | Node.js, PostgreSQL, event-driven systems |
| **[Team Member 3]** | Frontend / UX | React, Next.js, mobile-first design |
| **[Team Member 4]** | Fisheries Domain Expert | 8+ years West Africa fisheries compliance |

*Stellar Quest completed. Active in Stellar Dev Discord (#scf-general, #soroban-dev).*

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, issue labels, and PR process.

Good first issues are labelled [`good-first-issue`](https://github.com/your-org/sillage-bleu/labels/good-first-issue) — contributions welcome from the Stellar community.

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for responsible disclosure policy.  
Smart contracts will undergo a full audit via the **Soroban Audit Bank** program.

---

## 📄 License

MIT — see [LICENSE](LICENSE)
