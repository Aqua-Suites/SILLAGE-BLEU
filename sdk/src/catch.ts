import { BaseClient } from './client';
import { CatchSchema, type Catch, type SdkConfig } from './types';

export class CatchClient extends BaseClient {
  constructor(config: SdkConfig) {
    super(config);
  }

  /** Submit a catch event */
  async submit(catch_: Omit<Catch, 'catchId' | 'timestamp'>): Promise<{ catchId: string; status: string }> {
    return this.request('/api/catch', {
      method: 'POST',
      body: JSON.stringify(catch_),
    });
  }

  /** Get catch by ID */
  async get(catchId: string): Promise<Catch & { status: string; fraudFlags: string[] }> {
    return this.request(`/api/catch/${encodeURIComponent(catchId)}`);
  }

  /** List catches for a vessel */
  async listByVessel(vesselId: string, limit = 50): Promise<Catch[]> {
    return this.request(`/api/catch?vesselId=${encodeURIComponent(vesselId)}&limit=${limit}`);
  }

  /** List catches for a fisher */
  async listByFisher(fisherAddress: string, limit = 50): Promise<Catch[]> {
    return this.request(`/api/catch?fisherAddress=${encodeURIComponent(fisherAddress)}&limit=${limit}`);
  }
}
