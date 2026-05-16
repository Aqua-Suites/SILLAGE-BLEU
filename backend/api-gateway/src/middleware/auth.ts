import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  address: string;
  role: 'fisher' | 'vessel_owner' | 'verifier' | 'esg_auditor' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(roles?: AuthPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as AuthPayload;
      if (roles && !roles.includes(payload.role)) {
        res.status(403).json({ error: 'Insufficient role' });
        return;
      }
      req.auth = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}
