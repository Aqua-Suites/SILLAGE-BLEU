# Blue Credit Calculation Methodology

## Overview

Blue credits are issued on-chain via the `BlueCreditMinting` Soroban contract. The formula is deterministic and auditable by anyone with access to the Stellar ledger.

## Credit Unit

- 1 Blue Credit = 1,000,000 micro-credits (stored as `u64` on-chain)
- Credits are **soulbound** — non-transferable, tied to the fisher's Stellar address
- Credits can be **retired** by the fisher to claim ESG offset value

## Issuance Formula

### Step 1 — Sustainability Score (0–100)

```
sustainability_score = compliance_part + size_factor

compliance_part = vessel.compliance_score × 0.60
size_factor     = f(weight_kg)
  where:
    weight_kg ≤ 50    → size_factor = 40   (maximum)
    weight_kg ≥ 5000  → size_factor = 0    (minimum)
    otherwise         → size_factor = (5000 - weight_kg) / 4950 × 40
```

The compliance score comes from the `VesselRegistry` contract and reflects the vessel's historical behaviour (GPS anomalies, rejected catches).

### Step 2 — Base Credit Amount

```
base_credits = floor(weight_kg / 100) × 1,000,000
```

One credit is issued per 100 kg of verified catch.

### Step 3 — Sustainability Bonus

| Score Range | Bonus |
|-------------|-------|
| ≥ 80 | +50% of base |
| 60–79 | +25% of base |
| < 60 | No bonus |

### Step 4 — Total

```
total_credits = base_credits + bonus
```

## Example Calculations

| Weight (kg) | Compliance Score | Sustainability Score | Base Credits | Bonus | Total Credits |
|-------------|-----------------|---------------------|-------------|-------|---------------|
| 100 | 100 | 100 | 1.000000 | +0.500000 | **1.500000** |
| 500 | 90 | ~94 | 5.000000 | +2.500000 | **7.500000** |
| 500 | 60 | ~60 | 5.000000 | +1.250000 | **6.250000** |
| 1000 | 50 | ~46 | 10.000000 | 0 | **10.000000** |
| 5000 | 100 | 60 | 50.000000 | +12.500000 | **62.500000** |

## Verification

Every credit issuance emits a Soroban event:
```
topic: ("credit", "minted")
data:  (credit_id, amount, sustainability_score)
```

These events are permanently recorded on the Stellar ledger and can be independently verified by ESG auditors using the `ESGIndex` contract's Merkle root snapshots.

## ESG Snapshot Integrity

The `ESGIndex` contract stores a `merkle_root` with each periodic snapshot. This root is computed off-chain over all approved catch events in the period and submitted by a credentialed ESG auditor. Any third party can recompute the root from the raw data and verify it matches the on-chain value.
