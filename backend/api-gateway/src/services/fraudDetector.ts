import { db } from '../db/pool';
import type { CatchValidationJob } from '../workers/catchWorker';

const GPS_TOLERANCE_KM = Number(process.env.FRAUD_GPS_TOLERANCE_KM ?? 50);
const DUPLICATE_WINDOW_HOURS = Number(process.env.FRAUD_DUPLICATE_WINDOW_HOURS ?? 24);
const MAX_SPEED_KNOTS = 30; // physically impossible for fishing vessels

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const FraudDetector = {
  /** Check a telemetry ping for GPS spoofing */
  async checkTelemetry(
    vesselId: string,
    lat: number,
    lon: number,
    recordedAt: string,
  ): Promise<{ flagged: boolean; reason?: string }> {
    // Get last known position
    const { rows } = await db.query(
      `SELECT latitude, longitude, recorded_at FROM telemetry
       WHERE vessel_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [vesselId],
    );

    if (rows.length === 0) return { flagged: false };

    const prev = rows[0];
    const distKm = haversineKm(Number(prev.latitude), Number(prev.longitude), lat, lon);
    const elapsedHours =
      (new Date(recordedAt).getTime() - new Date(prev.recorded_at).getTime()) / 3_600_000;

    if (elapsedHours > 0) {
      const impliedSpeedKnots = (distKm / 1.852) / elapsedHours;
      if (impliedSpeedKnots > MAX_SPEED_KNOTS) {
        return { flagged: true, reason: `Impossible speed: ${impliedSpeedKnots.toFixed(1)} knots` };
      }
    }

    return { flagged: false };
  },

  /** Check a catch submission for fraud */
  async checkCatch(data: CatchValidationJob): Promise<{
    flagged: boolean;
    reason?: string;
    flags: string[];
  }> {
    const flags: string[] = [];

    // 1. Duplicate catch within window
    const { rows: dupes } = await db.query(
      `SELECT catch_id FROM catch_events
       WHERE vessel_id = $1
         AND submitted_at > NOW() - INTERVAL '${DUPLICATE_WINDOW_HOURS} hours'
         AND status != 'rejected'`,
      [data.vesselId],
    );
    if (dupes.length > 0) flags.push('duplicate_window');

    // 2. Weight anomaly (>5000 kg is suspicious for small-scale fishers)
    if (data.weightKg > 5_000) flags.push('excessive_weight');

    // 3. GPS out of known fishing zone (lat/lon sanity)
    if (Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
      flags.push('invalid_gps');
    }

    // 4. Vessel must be active
    const { rows: vessel } = await db.query(
      `SELECT status FROM vessels WHERE vessel_id = $1`,
      [data.vesselId],
    );
    if (vessel.length === 0 || vessel[0].status !== 'active') {
      flags.push('vessel_not_active');
    }

    const flagged = flags.length > 0;
    return { flagged, reason: flags.join(', '), flags };
  },
};
