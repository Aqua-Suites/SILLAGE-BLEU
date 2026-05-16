import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db/pool';

export const esgRouter = Router();

// Get ESG summary stats
esgRouter.get('/summary', requireAuth(), async (_req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(DISTINCT v.vessel_id)::int AS active_vessels,
        COALESCE(SUM(ce.weight_kg), 0)::bigint AS total_verified_kg,
        COALESCE(SUM(bc.amount), 0)::bigint AS total_credits_issued,
        COALESCE(AVG(v.compliance_score), 0)::int AS avg_compliance_score
      FROM vessels v
      LEFT JOIN catch_events ce ON ce.vessel_id = v.vessel_id AND ce.status = 'approved'
      LEFT JOIN blue_credits bc ON bc.vessel_id = v.vessel_id
      WHERE v.status = 'active'
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get ESG snapshots (for investors)
esgRouter.get('/snapshots', requireAuth(), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 12), 100);
    const { rows } = await db.query(
      `SELECT * FROM esg_snapshots ORDER BY period_start DESC LIMIT $1`,
      [limit],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Publish a new ESG snapshot (auditor/admin)
esgRouter.post(
  '/snapshots',
  requireAuth(['esg_auditor', 'admin']),
  async (req, res, next) => {
    try {
      const data = z.object({
        periodStart: z.number(),
        periodEnd: z.number(),
        merkleRoot: z.string(),
      }).parse(req.body);

      // Aggregate from DB
      const { rows } = await db.query(`
        SELECT
          COALESCE(SUM(ce.weight_kg), 0)::bigint AS total_verified_kg,
          COALESCE(SUM(bc.amount), 0)::bigint AS total_credits_issued,
          COUNT(DISTINCT v.vessel_id)::int AS active_vessels,
          COALESCE(AVG(v.compliance_score), 0)::int AS avg_sustainability_score
        FROM catch_events ce
        JOIN vessels v ON ce.vessel_id = v.vessel_id
        LEFT JOIN blue_credits bc ON bc.catch_id = ce.catch_id
        WHERE ce.status = 'approved'
          AND EXTRACT(EPOCH FROM ce.submitted_at) BETWEEN $1 AND $2
      `, [data.periodStart, data.periodEnd]);

      const stats = rows[0];

      await db.query(
        `INSERT INTO esg_snapshots (period_start, period_end, total_verified_kg, total_credits_issued, active_vessels, avg_sustainability_score, merkle_root)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (period_start) DO NOTHING`,
        [data.periodStart, data.periodEnd, stats.total_verified_kg, stats.total_credits_issued,
         stats.active_vessels, stats.avg_sustainability_score, data.merkleRoot],
      );

      res.status(201).json({ ...stats, ...data });
    } catch (err) {
      next(err);
    }
  },
);

// Per-vessel ESG report
esgRouter.get('/vessel/:vesselId', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        v.*,
        COUNT(ce.catch_id)::int AS total_catches,
        COALESCE(SUM(ce.weight_kg), 0)::bigint AS total_kg,
        COALESCE(SUM(bc.amount), 0)::bigint AS total_credits
      FROM vessels v
      LEFT JOIN catch_events ce ON ce.vessel_id = v.vessel_id AND ce.status = 'approved'
      LEFT JOIN blue_credits bc ON bc.vessel_id = v.vessel_id
      WHERE v.vessel_id = $1
      GROUP BY v.vessel_id
    `, [req.params.vesselId]);

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
