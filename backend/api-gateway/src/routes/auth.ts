import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Keypair } from '@stellar/stellar-sdk';
import { db } from '../db/pool';

export const authRouter = Router();

// Issue a challenge nonce for wallet sign-in
authRouter.get('/challenge/:address', (req, res) => {
  const nonce = `sillage-bleu:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  // In production, store nonce in Redis with TTL
  const token = jwt.sign({ nonce, address: req.params.address }, process.env.JWT_SECRET ?? '', {
    expiresIn: '5m',
  });
  res.json({ challenge: nonce, token });
});

// Verify signed challenge and issue session JWT
authRouter.post('/verify', async (req, res, next) => {
  try {
    const { challengeToken, signature, address } = z.object({
      challengeToken: z.string(),
      signature: z.string(),
      address: z.string(),
    }).parse(req.body);

    // Decode challenge
    const payload = jwt.verify(challengeToken, process.env.JWT_SECRET ?? '') as {
      nonce: string;
      address: string;
    };

    if (payload.address !== address) {
      return res.status(401).json({ error: 'Address mismatch' });
    }

    // Verify Stellar signature (Ed25519)
    const keypair = Keypair.fromPublicKey(address);
    const valid = keypair.verify(
      Buffer.from(payload.nonce),
      Buffer.from(signature, 'base64'),
    );

    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

    // Look up role from DB (or default to fisher)
    const { rows } = await db.query(
      `SELECT role FROM user_roles WHERE address = $1`,
      [address],
    ).catch(() => ({ rows: [] }));

    const role = rows[0]?.role ?? 'fisher';

    const sessionToken = jwt.sign(
      { address, role },
      process.env.JWT_SECRET ?? '',
      { expiresIn: '24h' },
    );

    res.json({ token: sessionToken, address, role });
  } catch (err) {
    next(err);
  }
});
