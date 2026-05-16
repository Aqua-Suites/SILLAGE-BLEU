import { describe, it, expect } from 'vitest';
import { CreditsClient } from '../credits';
import { TelemetryPingSchema } from '../types';

describe('CreditsClient.estimateCredits', () => {
  const client = new CreditsClient({ apiUrl: 'http://localhost:3001' });

  it('base: 100kg = 1 credit (1e6 micro)', () => {
    expect(client.estimateCredits(100, 50)).toBe(1_000_000);
  });

  it('high score bonus: 500kg + score 85 = 7.5 credits', () => {
    expect(client.estimateCredits(500, 85)).toBe(7_500_000);
  });

  it('mid score bonus: 200kg + score 65 = 2.5 credits', () => {
    expect(client.estimateCredits(200, 65)).toBe(2_500_000);
  });

  it('low score: no bonus', () => {
    expect(client.estimateCredits(300, 40)).toBe(3_000_000);
  });
});

describe('TelemetryPingSchema', () => {
  it('rejects invalid GPS', () => {
    expect(() => TelemetryPingSchema.parse({
      vesselId: 'V1', latitude: 200, longitude: 0,
      recordedAt: new Date().toISOString(),
    })).toThrow();
  });

  it('accepts valid ping', () => {
    const ping = TelemetryPingSchema.parse({
      vesselId: 'V1', latitude: 14.5, longitude: -17.2,
      speedKnots: 5, recordedAt: new Date().toISOString(),
    });
    expect(ping.source).toBe('gps');
  });
});
