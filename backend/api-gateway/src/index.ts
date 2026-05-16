import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';

import { telemetryRouter } from './routes/telemetry';
import { catchRouter } from './routes/catch';
import { creditsRouter } from './routes/credits';
import { esgRouter } from './routes/esg';
import { smsRouter } from './routes/sms';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true }));

app.use('/api/auth', authRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/catch', catchRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/esg', esgRouter);
app.use('/api/sms', smsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use(errorHandler);

const PORT = Number(process.env.API_PORT ?? 3001);
app.listen(PORT, () => console.log(`API gateway listening on :${PORT}`));

export default app;
