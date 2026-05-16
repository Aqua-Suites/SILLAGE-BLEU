import { BaseClient } from './client';
import type { SdkConfig } from './types';

export interface BlueCredit {
  creditId: string;
  vesselId: string;
  fisherAddress: string;
  catchId: string;
  amount: number;
  sustainabilityScore: number;
  issuedAt: string;
  retired: boolean;
}

export class CreditsClient extends BaseClient {
  constructor(config: SdkConfig) { super(config); }

  async listByFisher(fisherAddress: string): Promise<BlueCredit[]> {
    return this.request(`/api/credits/fisher/${encodeURIComponent(fisherAddress)}`);
  }

  async get(creditId: string): Promise<BlueCredit> {
    return this.request(`/api/credits/${encodeURIComponent(creditId)}`);
  }

  async mint(catchId: string): Promise<{ creditId: string; txHash: string }> {
    return this.request('/api/credits/mint', { method: 'POST', body: JSON.stringify({ catchId }) });
  }

  /** Client-side estimate — mirrors on-chain formula */
  estimateCredits(weightKg: number, sustainabilityScore: number): number {
    const base = Math.floor(weightKg / 100) * 1_000_000;
    const bonus = sustainabilityScore >= 80 ? base / 2 : sustainabilityScore >= 60 ? base / 4 : 0;
    return base + bonus;
  }
}
