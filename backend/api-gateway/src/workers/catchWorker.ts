import { Worker, Job } from 'bullmq';
import { redisConnection, creditQueue } from '../queue/queues';
import { db } from '../db/pool';
import { FraudDetector } from '../services/fraudDetector';
import { StellarService } from '../services/stellarService';

export interface CatchValidationJob {
  catchId: string;
  vesselId: string;
  fisherAddress: string;
  species: string;
  weightKg: number;
  latitude: number;
  longitude: number;
  ipfsEvidence: string;
  timestamp: string;
}

export const catchWorker = new Worker<CatchValidationJob>(
  'catch-validation',
  async (job: Job<CatchValidationJob>) => {
    const data = job.data;

    // Fraud detection
    const fraud = await FraudDetector.checkCatch(data);
    if (fraud.flagged) {
      await db.query(
        `UPDATE catch_events SET status = 'flagged', fraud_flags = $1 WHERE catch_id = $2`,
        [JSON.stringify(fraud.flags), data.catchId],
      );
      return { flagged: true, reason: fraud.reason };
    }

    // Submit to Soroban CatchVerification contract
    const txHash = await StellarService.submitCatch(data);

    await db.query(
      `UPDATE catch_events SET status = 'pending', stellar_tx_hash = $1 WHERE catch_id = $2`,
      [txHash, data.catchId],
    );

    return { flagged: false, txHash };
  },
  { connection: redisConnection, concurrency: 20 },
);
