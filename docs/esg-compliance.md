# ESG Compliance Documentation

## Framework Alignment

Sillage Bleu blue credits are designed to align with:

- **GRI 306** (Waste) and **GRI 14** (Biodiversity) for ocean impact reporting
- **TCFD** recommendations for climate-related financial disclosures
- **Sustainable Development Goal 14** — Life Below Water
- **Voluntary Carbon Market (VCM)** principles for additionality and permanence

---

## What a Blue Credit Represents

One Sillage Bleu Blue Credit certifies that:

1. A verified fishing vessel landed a sustainable catch
2. The catch was validated by a credentialed verifier
3. The vessel maintained a compliance score above the minimum threshold
4. The catch data is permanently recorded on the Stellar ledger

Credits are **soulbound** (non-transferable) to prevent double-counting. They can be **retired** by the fisher to claim offset value, at which point they are permanently marked on-chain.

---

## Audit Trail

Every credit has a complete on-chain audit trail:

```
Vessel registered     → VesselRegistry contract (ledger event)
Catch submitted       → CatchVerification contract (ledger event)
Catch approved        → CatchVerification contract (ledger event)
Credit minted         → BlueCreditMinting contract (ledger event)
ESG snapshot          → ESGIndex contract (Merkle root + ledger event)
```

All events are queryable via Stellar Horizon API:
```
GET https://horizon-testnet.stellar.org/accounts/{contract_id}/effects
```

---

## ESG Snapshot Process

ESG snapshots are published periodically (recommended: monthly) by a credentialed ESG auditor.

### Snapshot Contents

| Field | Description |
|-------|-------------|
| `period_start` / `period_end` | Unix timestamps for the reporting period |
| `total_verified_kg` | Total kilograms of verified sustainable catch |
| `total_credits_issued` | Total blue credits issued in the period |
| `active_vessels` | Number of active compliant vessels |
| `avg_sustainability_score` | Fleet-wide average sustainability score |
| `merkle_root` | Cryptographic root of all underlying catch records |

### Verification Steps for Auditors

1. Query all approved catch events from the API for the period
2. Compute the Merkle root over the sorted catch IDs and weights
3. Compare with the on-chain `merkle_root` in the `ESGIndex` contract
4. Verify the snapshot was submitted by a credentialed `esg_auditor` address

---

## Reporting for ESG Investors

The ESG Investor Dashboard provides:

- Real-time KPIs: active vessels, total verified catch, credits issued
- Historical trend charts (credits issued, sustainability scores)
- Per-vessel ESG reports with compliance history
- Downloadable audit-ready snapshots (JSON + PDF)

### API Access for Institutional Investors

```typescript
import { CreditsClient } from '@sillage-bleu/sdk';

const credits = new CreditsClient({
  apiUrl: 'https://api.sillagebleu.io',
  authToken: 'your-api-key',
});

// Get ESG summary
const summary = await fetch('https://api.sillagebleu.io/api/esg/summary').then(r => r.json());

// Get historical snapshots
const snapshots = await fetch('https://api.sillagebleu.io/api/esg/snapshots?limit=12').then(r => r.json());
```

---

## Additionality & Permanence

- **Additionality**: Credits are only issued for catches that pass fraud detection and verifier review. Vessels with compliance scores below 20 are suspended and cannot generate credits.
- **Permanence**: All records are written to the Stellar ledger, which is immutable. Retired credits are permanently flagged on-chain.
- **No double-counting**: Soulbound credit design prevents transfer or re-issuance of the same catch event.
