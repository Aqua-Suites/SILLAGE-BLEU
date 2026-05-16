import { BaseClient } from './client';
import { VesselSchema, type Vessel, type SdkConfig } from './types';

export class VesselClient extends BaseClient {
  constructor(config: SdkConfig) {
    super(config);
  }

  /** Register a new vessel */
  async register(vessel: Vessel): Promise<{ vesselId: string }> {
    const validated = VesselSchema.parse(vessel);
    return this.request('/api/vessels', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /** Get vessel by ID */
  async get(vesselId: string): Promise<Vessel & { status: string; complianceScore: number }> {
    return this.request(`/api/vessels/${encodeURIComponent(vesselId)}`);
  }

  /** Get ESG report for a vessel */
  async getEsgReport(vesselId: string): Promise<{
    complianceScore: number;
    totalCatches: number;
    totalKg: number;
    totalCredits: number;
  }> {
    return this.request(`/api/esg/vessel/${encodeURIComponent(vesselId)}`);
  }
}
