import { Router } from 'express';
import { z } from 'zod';
import { telemetryQueue } from '../queue/queues';
import { requireAuth } from '../middleware/auth';
import { db } from '../db/pool';

export const telemetryRouter = Router();

const TelemetrySchema = z.object({
  vesselId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKnots: z.number().optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime(),
  source: z.enum(['gps', 'sms', 'manual']).default('gps'),
});

// Ingest a single telemetry ping
telemetryRouter.post(
  '/',
  requireAuth(['fisher', 'vessel_owner', 'admin']),
  async (req, res, next) => {
    try {
      const data = TelemetrySchema.parse(req.body);
      await telemetryQueue.add('ping', { ...data });
      res.status(202).json({ queued: true });
    } catch (err) {
      next(err);
    }
  },
);

// Batch ingest (up to 100 pings)
telemetryRouter.post(
  '/batch',
  requireAuth(['fisher', 'vessel_owner', 'admin']),
  async (req, res, next) => {
    try {
      const items = z.array(TelemetrySchema).max(100).parse(req.body);
      await telemetryQueue.addBulk(items.map((d) => ({ name: 'ping', data: d })));
      res.status(202).json({ queued: items.length });
    } catch (err) {
      next(err);
    }
  },
);

// Get vessel telemetry history
telemetryRouter.get(
  '/:vesselId',
  requireAuth(),
  async (req, res, next) => {
    try {
      const { vesselId } = req.params;
      const limit = Math.min(Number(req.query.limit ?? 100), 1000);
      const { rows } = await db.query(
        `SELECT * FROM telemetry WHERE vessel_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
        [vesselId, limit],
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);
