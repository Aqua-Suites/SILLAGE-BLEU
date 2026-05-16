import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db/pool';
import { StellarService } from '../services/stellarService';
import { randomUUID } from 'crypto';

export const creditsRouter = Router();

// Mint credits for an approved catch (verifier/admin)
creditsRouter.post(
  '/mint',
  requireAuth(['verifier', 'admin']),
  async (req, res, next) => {
    try {
      const { catchId } = z.object({ catchId: z.string() }).parse(req.body);

      const { rows } = await db.query(
        `SELECT ce.*, v.compliance_score FROM catch_events ce
         JOIN vessels v ON ce.vessel_id = v.vessel_id
         WHERE ce.catch_id = $1 AND ce.status = 'approved'`,
        [catchId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Approved catch not found' });

      const catch_ = rows[0];
      const creditId = randomUUID();

      const txHash = await StellarService.mintCredit({
        creditId,
        vesselId: catch_.vessel_id,
        fisherAddress: catch_.fisher_address,
        catchId,
        weightKg: Number(catch_.weight_kg),
        complianceScore: catch_.compliance_score,
      });

      await db.query(
        `INSERT INTO blue_credits (credit_id, vessel_id, fisher_address, catch_id, amount, sustainability_score, stellar_tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [creditId, catch_.vessel_id, catch_.fisher_address, catchId, 0, catch_.compliance_score, txHash],
      );

      res.status(201).json({ creditId, txHash });
    } catch (err) {
      next(err);
    }
  },
);

// Get credits for a fisher
creditsRouter.get('/fisher/:address', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM blue_credits WHERE fisher_address = $1 ORDER BY issued_at DESC`,
      [req.params.address],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get credit by ID
creditsRouter.get('/:creditId', requireAuth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM blue_credits WHERE credit_id = $1`,
      [req.params.creditId],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
