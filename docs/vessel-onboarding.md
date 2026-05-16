# Vessel Onboarding Guide

## Prerequisites

- Stellar wallet (Freighter browser extension or Stellar keypair)
- Vessel IMO number (format: `IMO` + 7 digits, e.g. `IMO1234567`)
- 2-letter ISO flag state code (e.g. `SN` for Senegal, `GH` for Ghana)

## Step 1 — Get a Vessel Owner Role

Contact your regional Sillage Bleu administrator to have your Stellar address assigned the `vessel_owner` role. This is a one-time on-chain transaction.

## Step 2 — Connect Your Wallet

1. Open the Sillage Bleu web app
2. Click **Connect Freighter Wallet**
3. Approve the connection in Freighter
4. You will be redirected to the Fisher Dashboard

## Step 3 — Register Your Vessel

### Via Web Dashboard

Fill in the registration form:

| Field | Description | Example |
|-------|-------------|---------|
| Vessel ID | Your unique vessel identifier | `VESSEL-SN-001` |
| Vessel Name | Name of the vessel | `Blue Horizon` |
| Flag State | 2-letter ISO country code | `SN` |
| IMO Number | International Maritime Organization number | `IMO1234567` |
| Fisher Address | Stellar address of the assigned fisher | `G...` |

### Via SDK

```typescript
import { VesselClient } from '@sillage-bleu/sdk';

const vessels = new VesselClient({
  apiUrl: 'https://api.sillagebleu.io',
  authToken: 'your-jwt-token',
});

await vessels.register({
  vesselId: 'VESSEL-SN-001',
  ownerAddress: 'GOWNER...',
  fisherAddress: 'GFISHER...',
  name: 'Blue Horizon',
  flagState: 'SN',
  imoNumber: 'IMO1234567',
});
```

## Step 4 — Set Up Telemetry

### GPS Device (Automatic)

Configure your GPS tracker to POST to:
```
POST https://api.sillagebleu.io/api/telemetry
Authorization: Bearer <token>
Content-Type: application/json

{
  "vesselId": "VESSEL-SN-001",
  "latitude": 14.692,
  "longitude": -17.447,
  "speedKnots": 4.2,
  "recordedAt": "2026-05-16T08:00:00Z",
  "source": "gps"
}
```

### Low-Bandwidth (Buffered SDK)

```typescript
import { TelemetryClient } from '@sillage-bleu/sdk';

const telemetry = new TelemetryClient(
  { apiUrl: 'https://api.sillagebleu.io', authToken },
  10_000, // flush every 10 seconds
);

// Buffer pings — auto-flushes in batches
telemetry.bufferPing({ vesselId: 'VESSEL-SN-001', latitude: 14.692, longitude: -17.447, recordedAt: new Date().toISOString() });
```

### SMS Fallback (No Internet)

Send an SMS to the Sillage Bleu number:
```
START
```
Follow the prompts to report your vessel ID, species, and weight.

## Step 5 — Log Your First Catch

1. Go to **Fisher Dashboard → Log New Catch**
2. Enter vessel ID, species, weight, and GPS coordinates
3. Submit — your catch enters the verification queue
4. A verifier will approve within 24 hours
5. Upon approval, blue credits are automatically minted to your address

## Compliance Score

Your vessel starts with a score of **100/100**. It decreases when:
- GPS anomalies are detected (impossible speed between pings)
- Catches are flagged for fraud
- Catches are rejected by verifiers

Scores below 20 result in automatic vessel suspension.
