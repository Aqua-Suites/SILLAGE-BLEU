import { Router } from 'express';
import { z } from 'zod';
import { catchQueue } from '../queue/queues';
import { requireAuth } from '../middleware/auth';
import { db } from '../db/pool';
import { randomUUID } from 'crypto';

export const catchRouter = Router();

const CatchSchema = z.object({
  vesselId: z.string().min(1),
  species: z.string().min(1),
  weightKg: z.number().positive().max(10_000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ipfsEvidence: z.string().optional().default(''),
});

// Submit a catch event
catchRouter.post(
  '/',
  requireAuth(['fisher', 'vessel_owner']),
  async (req, res, next) => {
    try {
      const data = CatchSchema.parse(req.body);
      const catchId = randomUUID();
      const fisherAddress = req.auth!.address;

      await db.query(
        `INSERT INTO catch_events (catch_id, vessel_id, fisher_address, species, weight_kg, latitude, longitude, ipfs_evidence, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [catchId, data.vesselId, fisherAddress, data.species, data.weightKg, data.latitude, data.longitude, data.ipfsEvidence],
      );

      await catchQueue.add('validate', {
        catchId,
        vesselId: data.vesselId,
        fisherAddress,
        ...data,
        timestamp: new Date().toISOString(),
      });

      res.status(202).json({ catchId, status: 'pending' });
    } catch (err) {
      next(err);
    }
  },
);

// Get catch by ID
catchRouter.get('/:catchId', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM catch_events WHERE catch_id = $1`,
      [req.params.catchId],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Verifier approves/rejects a catch
catchRouter.patch(
  '/:catchId/verify',
  requireAuth(['verifier', 'admin']),
  async (req, res, next) => {
    try {
      const { approved, reason } = z.object({
        approved: z.boolean(),
        reason: z.string().optional().default(''),
      }).parse(req.body);

      const status = approved ? 'approved' : 'rejected';
      await db.query(
        `UPDATE catch_events SET status = $1, verifier_address = $2, verified_at = NOW() WHERE catch_id = $3`,
        [status, req.auth!.address, req.params.catchId],
      );

      res.json({ catchId: req.params.catchId, status });
    } catch (err) {
      next(err);
    }
  },
);

// List catches (with filters)
catchRouter.get('/', requireAuth(), async (req, res, next) => {
  try {
    const { vesselId, status, limit = 50 } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (vesselId) { conditions.push(`vessel_id = $${params.push(vesselId)}`); }
    if (status) { conditions.push(`status = $${params.push(status)}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Math.min(Number(limit), 500));

    const { rows } = await db.query(
      `SELECT * FROM catch_events ${where} ORDER BY submitted_at DESC LIMIT $${params.length}`,
      params,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
