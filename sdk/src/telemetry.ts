import { BaseClient } from './client';
import { TelemetryPingSchema, type TelemetryPing, type SdkConfig } from './types';

export class TelemetryClient extends BaseClient {
  private buffer: TelemetryPing[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(config: SdkConfig, private readonly bufferMs = 5_000) {
    super(config);
  }

  /** Send a single telemetry ping immediately */
  async ping(data: TelemetryPing): Promise<void> {
    const validated = TelemetryPingSchema.parse(data);
    await this.request('/api/telemetry', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /** Buffer a ping and flush in batches (good for low-bandwidth environments) */
  bufferPing(data: TelemetryPing): void {
    this.buffer.push(TelemetryPingSchema.parse(data));
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.bufferMs);
    }
  }

  /** Flush buffered pings as a batch */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    this.flushTimer = undefined;
    await this.request('/api/telemetry/batch', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  /** Get telemetry history for a vessel */
  async history(vesselId: string, limit = 100): Promise<TelemetryPing[]> {
    return this.request(`/api/telemetry/${encodeURIComponent(vesselId)}?limit=${limit}`);
  }
}
