'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface CatchEvent {
  catch_id: string;
  vessel_id: string;
  fisher_address: string;
  species: string;
  weight_kg: number;
  status: string;
  fraud_flags: string[];
  submitted_at: string;
}

export default function RegulatorDashboard() {
  const qc = useQueryClient();

  const pending = useQuery<CatchEvent[]>({
    queryKey: ['catches-pending'],
    queryFn: () => api.get('/api/catch?status=pending'),
    refetchInterval: 15_000,
  });

  const flagged = useQuery<CatchEvent[]>({
    queryKey: ['catches-flagged'],
    queryFn: () => api.get('/api/catch?status=flagged'),
    refetchInterval: 15_000,
  });

  const verify = useMutation({
    mutationFn: ({ catchId, approved }: { catchId: string; approved: boolean }) =>
      api.patch(`/api/catch/${catchId}/verify`, { approved, reason: approved ? 'Verified by regulator' : 'Rejected by regulator' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catches-pending'] });
      qc.invalidateQueries({ queryKey: ['catches-flagged'] });
    },
  });

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '900px' }}>
      <h1 style={{ color: 'var(--ocean)', marginBottom: '1.5rem' }}>🔍 Regulator Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#92400e' }}>{pending.data?.length ?? 0}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Pending Review</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#991b1b' }}>{flagged.data?.length ?? 0}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Fraud Flags</div>
        </div>
      </div>

      {/* Flagged catches */}
      {(flagged.data?.length ?? 0) > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: '#fca5a5' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#991b1b' }}>⚠️ Fraud Alerts</h2>
          <CatchTable catches={flagged.data ?? []} onVerify={verify.mutate} />
        </div>
      )}

      {/* Pending catches */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⏳ Pending Verification</h2>
        {pending.isLoading ? <p>Loading…</p> : (
          <CatchTable catches={pending.data ?? []} onVerify={verify.mutate} />
        )}
      </div>
    </div>
  );
}

function CatchTable({
  catches,
  onVerify,
}: {
  catches: CatchEvent[];
  onVerify: (args: { catchId: string; approved: boolean }) => void;
}) {
  if (catches.length === 0) return <p style={{ color: 'var(--muted)' }}>None at this time.</p>;

  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      {catches.map(c => (
        <div key={c.catch_id} style={{ padding: '.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{c.species} — {c.weight_kg} kg</div>
            <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>
              Vessel: {c.vessel_id} · {new Date(c.submitted_at).toLocaleString()}
            </div>
            {c.fraud_flags?.length > 0 && (
              <div style={{ color: '#991b1b', fontSize: '.75rem', marginTop: '.25rem' }}>
                Flags: {c.fraud_flags.join(', ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-primary" style={{ fontSize: '.8rem', padding: '.35rem .75rem', background: 'var(--green)' }}
              onClick={() => onVerify({ catchId: c.catch_id, approved: true })}>
              ✅ Approve
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '.8rem', padding: '.35rem .75rem', background: '#fee2e2', color: '#991b1b' }}
              onClick={() => onVerify({ catchId: c.catch_id, approved: false })}>
              ❌ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
