import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const telemetryQueue = new Queue('telemetry', { connection });
export const catchQueue = new Queue('catch-validation', { connection });
export const creditQueue = new Queue('credit-minting', { connection });
export const payoutQueue = new Queue('payout-settlement', { connection });

export { connection as redisConnection };
