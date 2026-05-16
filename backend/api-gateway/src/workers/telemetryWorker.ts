import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queue/queues';
import { db } from '../db/pool';
import { FraudDetector } from '../services/fraudDetector';

export interface TelemetryJob {
  vesselId: string;
  latitude: number;
  longitude: number;
  speedKnots?: number;
  headingDeg?: number;
  recordedAt: string;
  source: 'gps' | 'sms' | 'manual';
}

export const telemetryWorker = new Worker<TelemetryJob>(
  'telemetry',
  async (job: Job<TelemetryJob>) => {
    const { vesselId, latitude, longitude, speedKnots, headingDeg, recordedAt, source } = job.data;

    // Persist telemetry ping
    await db.query(
      `INSERT INTO telemetry (vessel_id, latitude, longitude, speed_knots, heading_deg, recorded_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vesselId, latitude, longitude, speedKnots ?? null, headingDeg ?? null, recordedAt, source],
    );

    // Run fraud checks on the ping
    const fraud = await FraudDetector.checkTelemetry(vesselId, latitude, longitude, recordedAt);
    if (fraud.flagged) {
      await db.query(
        `UPDATE vessels SET compliance_score = GREATEST(compliance_score - 5, 0) WHERE vessel_id = $1`,
        [vesselId],
      );
      job.log(`Fraud flag: ${fraud.reason}`);
    }
  },
  { connection: redisConnection, concurrency: 50 },
);
