import { z } from 'zod';

export const VesselSchema = z.object({
  vesselId: z.string().min(1),
  ownerAddress: z.string().length(56),
  fisherAddress: z.string().length(56),
  name: z.string().min(1),
  flagState: z.string().length(2),
  imoNumber: z.string().regex(/^IMO\d{7}$/),
});

export const CatchSchema = z.object({
  catchId: z.string().uuid(),
  vesselId: z.string().min(1),
  fisherAddress: z.string(),
  species: z.string().min(1),
  weightKg: z.number().positive().max(10_000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ipfsEvidence: z.string().optional().default(''),
  timestamp: z.string().datetime(),
});

export const TelemetryPingSchema = z.object({
  vesselId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKnots: z.number().optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime(),
  source: z.enum(['gps', 'sms', 'manual']).default('gps'),
});

export type Vessel = z.infer<typeof VesselSchema>;
export type Catch = z.infer<typeof CatchSchema>;
export type TelemetryPing = z.infer<typeof TelemetryPingSchema>;

export interface SdkConfig {
  apiUrl: string;
  authToken?: string;
  network?: 'testnet' | 'mainnet';
}
