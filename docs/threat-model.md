# Threat Model — Sillage Bleu

This document describes the security threat model for the Sillage Bleu platform, covering the Soroban smart contracts, backend API, and SMS/telemetry ingestion pipeline.

---

## Trust Boundaries

```
[Fisher device / SMS]  →  [Africa's Talking]  →  [API Gateway]  →  [Soroban contracts]
        ↑                                               ↑
   Untrusted input                              JWT-authenticated
   (must be validated)                          (Stellar Ed25519)
```

| Component | Trust Level |
|---|---|
| Fisher GPS device / SMS | **Untrusted** — all input validated and fraud-checked |
| Africa's Talking webhook | **Semi-trusted** — webhook secret verified, payload validated |
| API Gateway | **Trusted** — internal, JWT-gated |
| Soroban contracts | **Fully trusted** — deterministic, immutable, role-enforced |
| Verifier (human) | **Trusted role** — on-chain role assignment, auditable |

---

## Threat 1: GPS Spoofing / Fake Telemetry

**Attack:** A fisher submits fabricated GPS coordinates to claim they were fishing in a certified zone when they were not.

**Mitigations:**
- **Speed analysis (off-chain):** `FraudDetector.checkTelemetry()` computes the implied speed between consecutive pings using the haversine formula. Any implied speed > 30 knots (physically impossible for fishing vessels) is flagged.
- **Compliance score decay (on-chain):** Flagged telemetry decrements the vessel's `compliance_score` in `VesselRegistry`. A score below 20 automatically suspends the vessel.
- **Verifier review (on-chain):** All catch events require explicit verifier approval before credits are minted. A verifier can flag a catch as `Flagged` status, blocking credit issuance.
- **IPFS evidence requirement:** Catches can include an IPFS CID for photo/document evidence, creating an immutable audit trail.

**Residual risk:** A sophisticated attacker with a GPS spoofer could generate plausible-looking tracks. Mitigation: cross-reference with AIS (Automatic Identification System) data in Tranche 3.

---

## Threat 2: Duplicate Catch Submission

**Attack:** A fisher submits the same catch multiple times to receive multiple payouts.

**Mitigations:**
- **On-chain duplicate guard (primary):** `CatchVerification` uses Soroban temporary storage keyed by `(vessel_id, timestamp_bucket)`. Within any 1-hour window, a vessel can only submit one catch. This is enforced at the contract level and cannot be bypassed by the backend.
- **Off-chain duplicate window (secondary):** `FraudDetector.checkCatch()` queries PostgreSQL for catches from the same vessel within a configurable window (default: 24 hours). Flags `duplicate_window` before the transaction even reaches the contract.
- **Catch ID uniqueness:** Each catch has a UUID `catch_id`. The contract rejects any submission with a pre-existing `catch_id` (`CatchExists` error).

**Residual risk:** Duplicate submissions across different vessels owned by the same operator. Mitigation: fisher-level duplicate detection in Tranche 2.

---

## Threat 3: Weight Inflation

**Attack:** A fisher reports a much larger catch weight than actual to receive more blue credits.

**Mitigations:**
- **On-chain weight cap:** `CatchVerification` rejects any catch with `weight_kg > 10,000` (`InvalidWeight` error). This is enforced at the contract level.
- **Off-chain anomaly detection:** `FraudDetector` flags catches with `weight_kg > 5,000` as `excessive_weight` for manual verifier review.
- **Sustainability score penalty:** The `BlueCreditMinting` scoring formula penalizes large catches — the `size_factor` component scores smaller catches higher (more sustainable). A 5,000 kg catch scores 0 on the size factor vs. 40 for a ≤50 kg catch.
- **Verifier approval gate:** No credits are minted without explicit verifier approval. Anomalous weights are flagged for human review.

---

## Threat 4: Unauthorized Credit Minting

**Attack:** A malicious actor calls `BlueCreditMinting.mint_credit()` directly to issue credits without a verified catch.

**Mitigations:**
- **On-chain role enforcement:** `mint_credit()` requires the caller to have the `Verifier` or `Admin` role, enforced by `require_role()`. Any other caller causes the contract to panic with `Unauthorized`.
- **Role assignment is admin-only:** Only the contract admin can assign roles via `set_role()`. The admin address is set at initialization and cannot be changed.
- **Immutable contracts:** No upgrade mechanism exists. The scoring formula cannot be changed post-deployment.

---

## Threat 5: Verifier Compromise

**Attack:** A verifier's private key is stolen and used to approve fraudulent catches or mint unauthorized credits.

**Mitigations:**
- **Multi-verifier design (Tranche 2):** The system supports multiple verifier addresses. A compromised verifier can be suspended by the admin via `set_role()` reassignment.
- **On-chain event log:** Every `verify_catch()` and `mint_credit()` call emits a contract event with the verifier's address. Anomalous approval patterns are detectable.
- **Off-chain audit log:** All API calls are logged via pino with the JWT-authenticated address. Suspicious activity triggers alerts.
- **Catch flagging:** Any verifier or admin can call `flag_catch()` to reverse an approval and block credit issuance.

---

## Threat 6: SMS Injection / Webhook Spoofing

**Attack:** An attacker sends forged SMS webhooks to the Africa's Talking endpoint to submit catches without a real fisher.

**Mitigations:**
- **Webhook secret verification:** Africa's Talking signs all webhooks. The `smsService` verifies the signature before processing any payload.
- **Vessel ID validation:** The SMS state machine requires a valid, registered vessel ID. Unregistered vessel IDs are rejected at the API layer before any database write.
- **Rate limiting:** The API gateway enforces 200 req/min per IP. Bulk injection attempts are rate-limited.
- **Same fraud detection pipeline:** SMS-submitted catches go through the identical `FraudDetector` checks as GPS-submitted catches.

---

## Threat 7: Payout Theft

**Attack:** An attacker intercepts or redirects XLM payouts intended for fishers.

**Mitigations:**
- **On-chain fisher address binding:** `PayoutRecord` stores the fisher's Stellar address at queue time. `execute_payout()` transfers directly to `record.fisher` — the destination cannot be changed after queuing.
- **Admin-only execution:** Only the contract admin can call `execute_payout()` or `batch_execute()`.
- **Payout status guard:** `AlreadyExecuted` error prevents double-execution of the same payout.
- **Stellar transaction finality:** Once the XLM transfer is confirmed on Stellar (3–5 seconds), it is irreversible.

---

## Audit Plan

All 5 contracts will be submitted to the **Soroban Audit Bank** program in Tranche 2. The audit will specifically cover:

1. Integer overflow/underflow in credit calculation arithmetic
2. Role escalation paths
3. Reentrancy (not applicable to Soroban's execution model, but will be confirmed)
4. Temporary storage expiry edge cases in the duplicate guard
5. Token transfer authorization in `Settlement`

The full audit report will be published in the repository upon completion.
