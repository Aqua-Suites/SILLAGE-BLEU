import type { SdkConfig } from './types';

export class BaseClient {
  protected config: SdkConfig;

  constructor(config: SdkConfig) {
    this.config = config;
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  setAuthToken(token: string): void {
    this.config.authToken = token;
  }
}
