'use client';
import { useState, useCallback } from 'react';
import {
  getPublicKey,
  isConnected,
  signTransaction,
} from '@stellar/freighter-api';
import { api } from './api';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await isConnected();
      if (!connected) throw new Error('Freighter not installed');

      const pubkey = await getPublicKey();

      // Get challenge
      const { challenge, token: challengeToken } = await api.get<{
        challenge: string;
        token: string;
      }>(`/api/auth/challenge/${pubkey}`);

      // Sign challenge with Freighter
      const { signedXDR } = await signTransaction(challenge, {
        networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
      });

      // Verify and get session token
      const { token, role: userRole } = await api.post<{ token: string; role: string }>(
        '/api/auth/verify',
        { challengeToken, signature: signedXDR, address: pubkey },
      );

      localStorage.setItem('sb_token', token);
      setAddress(pubkey);
      setRole(userRole);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('sb_token');
    setAddress(null);
    setRole(null);
  }, []);

  return { address, role, connecting, connect, disconnect };
}
