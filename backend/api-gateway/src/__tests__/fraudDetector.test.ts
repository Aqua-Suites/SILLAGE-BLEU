import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FraudDetector } from '../services/fraudDetector';

// Mock DB
vi.mock('../db/pool', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { db } from '../db/pool';

describe('FraudDetector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flags impossible GPS speed', async () => {
    const prevTime = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ latitude: '0', longitude: '0', recorded_at: prevTime }],
    } as any);

    // 1000km away in 1 minute = impossible
    const result = await FraudDetector.checkTelemetry('V1', 9.0, 0, new Date().toISOString());
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain('Impossible speed');
  });

  it('passes valid telemetry', async () => {
    const prevTime = new Date(Date.now() - 3_600_000).toISOString(); // 1 hour ago
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [{ latitude: '14.0', longitude: '-17.0', recorded_at: prevTime }],
    } as any);

    // 5km in 1 hour = fine
    const result = await FraudDetector.checkTelemetry(
      'V1', 14.045, -17.0, new Date().toISOString(),
    );
    expect(result.flagged).toBe(false);
  });

  it('flags excessive weight', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as any) // no duplicates
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] } as any); // vessel active

    const result = await FraudDetector.checkCatch({
      catchId: 'C1', vesselId: 'V1', fisherAddress: 'addr',
      species: 'Tuna', weightKg: 9_999,
      latitude: 14, longitude: -17,
      ipfsEvidence: '', timestamp: new Date().toISOString(),
    });
    expect(result.flagged).toBe(true);
    expect(result.flags).toContain('excessive_weight');
  });

  it('flags duplicate catch within window', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ catch_id: 'existing' }] } as any) // duplicate found
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] } as any);

    const result = await FraudDetector.checkCatch({
      catchId: 'C2', vesselId: 'V1', fisherAddress: 'addr',
      species: 'Sardine', weightKg: 100,
      latitude: 14, longitude: -17,
      ipfsEvidence: '', timestamp: new Date().toISOString(),
    });
    expect(result.flags).toContain('duplicate_window');
  });
});
