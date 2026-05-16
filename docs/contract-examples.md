# Smart Contract Interaction Examples

All contracts are deployed on Stellar Soroban. Use the Stellar CLI or `@stellar/stellar-sdk` to interact.

## Using Stellar CLI

```bash
# Set up network alias
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Fund a test account
stellar keys generate fisher --network testnet
stellar keys fund fisher --network testnet
```

## VesselRegistry

```bash
# Initialize (admin only, once)
stellar contract invoke --id $CONTRACT_VESSEL_REGISTRY \
  --source admin --network testnet \
  -- initialize --admin $(stellar keys address admin)

# Assign vessel_owner role
stellar contract invoke --id $CONTRACT_VESSEL_REGISTRY \
  --source admin --network testnet \
  -- set_role \
    --caller $(stellar keys address admin) \
    --target $(stellar keys address owner) \
    --role VesselOwner

# Register a vessel
stellar contract invoke --id $CONTRACT_VESSEL_REGISTRY \
  --source owner --network testnet \
  -- register_vessel \
    --owner $(stellar keys address owner) \
    --fisher $(stellar keys address fisher) \
    --vessel_id "VESSEL-SN-001" \
    --name "Blue Horizon" \
    --flag_state "SN" \
    --imo_number "IMO1234567"
```

## CatchVerification

```bash
# Submit a catch
stellar contract invoke --id $CONTRACT_CATCH_VERIFICATION \
  --source fisher --network testnet \
  -- submit_catch \
    --fisher $(stellar keys address fisher) \
    --catch_id "CATCH-001" \
    --vessel_id "VESSEL-SN-001" \
    --species "Yellowfin Tuna" \
    --weight_kg 500 \
    --latitude 14692000 \
    --longitude -17447000 \
    --ipfs_evidence "QmXyz..."

# Verifier approves
stellar contract invoke --id $CONTRACT_CATCH_VERIFICATION \
  --source verifier --network testnet \
  -- verify_catch \
    --verifier $(stellar keys address verifier) \
    --catch_id "CATCH-001" \
    --approved true \
    --reason "GPS and weight validated"
```

## BlueCreditMinting

```bash
# Mint credits for approved catch
stellar contract invoke --id $CONTRACT_BLUE_CREDIT_MINTING \
  --source verifier --network testnet \
  -- mint_credit \
    --caller $(stellar keys address verifier) \
    --credit_id "CREDIT-001" \
    --vessel_id "VESSEL-SN-001" \
    --fisher $(stellar keys address fisher) \
    --catch_id "CATCH-001" \
    --weight_kg 500 \
    --compliance_score 90

# Check total issued
stellar contract invoke --id $CONTRACT_BLUE_CREDIT_MINTING \
  --source fisher --network testnet \
  -- get_total_issued
```

## Settlement

```bash
# Queue a payout
stellar contract invoke --id $CONTRACT_SETTLEMENT \
  --source verifier --network testnet \
  -- queue_payout \
    --caller $(stellar keys address verifier) \
    --payout_id "PAY-001" \
    --fisher $(stellar keys address fisher) \
    --amount 1000000 \
    --catch_id "CATCH-001"

# Execute payout (admin)
stellar contract invoke --id $CONTRACT_SETTLEMENT \
  --source admin --network testnet \
  -- execute_payout \
    --caller $(stellar keys address admin) \
    --payout_id "PAY-001"
```

## Using the TypeScript SDK

```typescript
import { VesselClient, CatchClient, CreditsClient, TelemetryClient } from '@sillage-bleu/sdk';

const config = {
  apiUrl: 'https://api.sillagebleu.io',
  authToken: 'your-jwt-token',
};

// Register vessel
const vessels = new VesselClient(config);
await vessels.register({
  vesselId: 'VESSEL-SN-001',
  ownerAddress: 'GOWNER...',
  fisherAddress: 'GFISHER...',
  name: 'Blue Horizon',
  flagState: 'SN',
  imoNumber: 'IMO1234567',
});

// Submit catch
const catches = new CatchClient(config);
const { catchId } = await catches.submit({
  vesselId: 'VESSEL-SN-001',
  fisherAddress: 'GFISHER...',
  species: 'Yellowfin Tuna',
  weightKg: 500,
  latitude: 14.692,
  longitude: -17.447,
});

// Estimate credits before minting
const credits = new CreditsClient(config);
const estimate = credits.estimateCredits(500, 90);
console.log(`Expected: ${estimate / 1e6} credits`); // 7.5

// Stream telemetry (buffered for low-bandwidth)
const telemetry = new TelemetryClient(config, 10_000);
telemetry.bufferPing({
  vesselId: 'VESSEL-SN-001',
  latitude: 14.692,
  longitude: -17.447,
  speedKnots: 4.2,
  recordedAt: new Date().toISOString(),
});
```
