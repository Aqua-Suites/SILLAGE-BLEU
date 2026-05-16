'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { useWallet } from '../../lib/useWallet';

interface CatchEvent {
  catch_id: string;
  species: string;
  weight_kg: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  submitted_at: string;
}

interface BlueCredit {
  credit_id: string;
  amount: number;
  sustainability_score: number;
  issued_at: string;
}

export default function FisherDashboard() {
  const { address } = useWallet();
  const qc = useQueryClient();
  const [form, setForm] = useState({ vesselId: '', species: '', weightKg: '', lat: '', lon: '' });

  const catches = useQuery<CatchEvent[]>({
    queryKey: ['catches', address],
    queryFn: () => api.get(`/api/catch?fisherAddress=${address}`),
    enabled: !!address,
  });

  const credits = useQuery<BlueCredit[]>({
    queryKey: ['credits', address],
    queryFn: () => api.get(`/api/credits/fisher/${address}`),
    enabled: !!address,
  });

  const submitCatch = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/api/catch', {
        vesselId: data.vesselId,
        species: data.species,
        weightKg: Number(data.weightKg),
        latitude: Number(data.lat),
        longitude: Number(data.lon),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catches'] });
      setForm({ vesselId: '', species: '', weightKg: '', lat: '', lon: '' });
    },
  });

  const totalCredits = credits.data?.reduce((s, c) => s + c.amount, 0) ?? 0;

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '800px' }}>
      <h1 style={{ color: 'var(--ocean)', marginBottom: '1.5rem' }}>🎣 Fisher Dashboard</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Catches" value={catches.data?.length ?? 0} />
        <StatCard label="Approved" value={catches.data?.filter(c => c.status === 'approved').length ?? 0} color="var(--green)" />
        <StatCard label="Blue Credits" value={(totalCredits / 1_000_000).toFixed(2)} color="var(--ocean)" />
      </div>

      {/* Log Catch Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📋 Log New Catch</h2>
        <div style={{ display: 'grid', gap: '.75rem' }}>
          {[
            { key: 'vesselId', label: 'Vessel ID', placeholder: 'e.g. VESSEL001' },
            { key: 'species', label: 'Species', placeholder: 'e.g. Yellowfin Tuna' },
            { key: 'weightKg', label: 'Weight (kg)', placeholder: 'e.g. 250', type: 'number' },
            { key: 'lat', label: 'Latitude', placeholder: 'e.g. 14.692', type: 'number' },
            { key: 'lon', label: 'Longitude', placeholder: 'e.g. -17.447', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', fontSize: '.875rem' }}>
              {label}
              <input
                type={type ?? 'text'}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ padding: '.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' }}
              />
            </label>
          ))}
          <button
            className="btn btn-primary"
            onClick={() => submitCatch.mutate(form)}
            disabled={submitCatch.isPending}
          >
            {submitCatch.isPending ? 'Submitting…' : '✅ Submit Catch'}
          </button>
        </div>
      </div>

      {/* Catch History */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📜 Catch History</h2>
        {catches.isLoading ? <p>Loading…</p> : (
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {catches.data?.map(c => (
              <div key={c.catch_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.species}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{c.weight_kg} kg · {new Date(c.submitted_at).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
            {catches.data?.length === 0 && <p style={{ color: 'var(--muted)' }}>No catches yet. Log your first catch above.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: color ?? 'var(--text)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-green', pending: 'badge-yellow', rejected: 'badge-red', flagged: 'badge-red',
  };
  return <span className={`badge ${map[status] ?? 'badge-blue'}`}>{status}</span>;
}
