import AfricasTalking from 'africastalking';
import { db } from '../db/pool';
import { catchQueue } from '../queue/queues';
import { randomUUID } from 'crypto';

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY ?? '',
  username: process.env.AT_USERNAME ?? 'sandbox',
});
const sms = at.SMS;

/**
 * SMS catch reporting state machine.
 * Flow: INIT → VESSEL_ID → SPECIES → WEIGHT → CONFIRM → DONE
 */
export const SmsService = {
  async handleIncoming(phone: string, text: string): Promise<string> {
    const normalized = text.trim().toUpperCase();

    // Get or create session
    const { rows } = await db.query(
      `SELECT * FROM sms_sessions WHERE phone_number = $1 AND state != 'done'
       ORDER BY created_at DESC LIMIT 1`,
      [phone],
    );

    if (rows.length === 0 || normalized === 'START') {
      return this.startSession(phone);
    }

    const session = rows[0];
    return this.advanceSession(session, normalized);
  },

  async startSession(phone: string): Promise<string> {
    const sessionId = randomUUID();
    await db.query(
      `INSERT INTO sms_sessions (session_id, phone_number, state) VALUES ($1, $2, 'vessel_id')`,
      [sessionId, phone],
    );
    return 'SILLAGE BLEU\nEnter your Vessel ID:';
  },

  async advanceSession(session: any, input: string): Promise<string> {
    const { session_id, state, data } = session;
    const sessionData = data ?? {};

    switch (state) {
      case 'vessel_id': {
        // Verify vessel exists
        const { rows } = await db.query(
          `SELECT vessel_id FROM vessels WHERE vessel_id = $1 AND status = 'active'`,
          [input],
        );
        if (rows.length === 0) return 'Vessel not found. Try again or send START.';
        await this.updateSession(session_id, 'species', { ...sessionData, vesselId: input });
        return `Vessel ${input} found.\nEnter species caught:`;
      }

      case 'species': {
        await this.updateSession(session_id, 'weight', { ...sessionData, species: input });
        return 'Enter catch weight in KG (numbers only):';
      }

      case 'weight': {
        const weight = Number(input);
        if (isNaN(weight) || weight <= 0 || weight > 10_000) {
          return 'Invalid weight. Enter a number between 1 and 10000:';
        }
        await this.updateSession(session_id, 'confirm', { ...sessionData, weightKg: weight });
        return `Confirm catch:\nVessel: ${sessionData.vesselId}\nSpecies: ${sessionData.species}\nWeight: ${weight}kg\nReply YES to submit or NO to cancel.`;
      }

      case 'confirm': {
        if (input === 'YES') {
          await this.submitCatch(session);
          await this.updateSession(session_id, 'done', sessionData);
          return 'Catch submitted! You will receive confirmation shortly.';
        }
        await this.updateSession(session_id, 'done', sessionData);
        return 'Cancelled. Send START to begin again.';
      }

      default:
        return 'Session expired. Send START to begin.';
    }
  },

  async updateSession(sessionId: string, state: string, data: object): Promise<void> {
    await db.query(
      `UPDATE sms_sessions SET state = $1, data = $2, updated_at = NOW() WHERE session_id = $3`,
      [state, JSON.stringify(data), sessionId],
    );
  },

  async submitCatch(session: any): Promise<void> {
    const { data, phone_number } = session;
    const catchId = randomUUID();

    await db.query(
      `INSERT INTO catch_events (catch_id, vessel_id, fisher_address, species, weight_kg, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, 0, 0, 'pending')`,
      [catchId, data.vesselId, phone_number, data.species, data.weightKg],
    );

    await catchQueue.add('validate', {
      catchId,
      vesselId: data.vesselId,
      fisherAddress: phone_number,
      species: data.species,
      weightKg: data.weightKg,
      latitude: 0,
      longitude: 0,
      ipfsEvidence: '',
      timestamp: new Date().toISOString(),
    });
  },

  async sendSms(to: string, message: string): Promise<void> {
    await sms.send({
      to: [to],
      message,
      from: process.env.AT_SENDER_ID ?? 'SILLAGE',
    });
  },
};
