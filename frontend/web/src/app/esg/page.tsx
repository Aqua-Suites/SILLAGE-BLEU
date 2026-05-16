'use client';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';

interface EsgSummary {
  active_vessels: number;
  total_verified_kg: number;
  total_credits_issued: number;
  avg_compliance_score: number;
}

interface EsgSnapshot {
  period_start: number;
  total_verified_kg: number;
  total_credits_issued: number;
  avg_sustainability_score: number;
  active_vessels: number;
}

export default function EsgDashboard() {
  const summary = useQuery<EsgSummary>({
    queryKey: ['esg-summary'],
    queryFn: () => api.get('/api/esg/summary'),
  });

  const snapshots = useQuery<EsgSnapshot[]>({
    queryKey: ['esg-snapshots'],
    queryFn: () => api.get('/api/esg/snapshots?limit=12'),
  });

  const chartData = snapshots.data?.map(s => ({
    period: new Date(s.period_start * 1000).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
    credits: s.total_credits_issued / 1_000_000,
    kg: s.total_verified_kg / 1000,
    score: s.avg_sustainability_score,
  })).reverse() ?? [];

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '1000px' }}>
      <h1 style={{ color: 'var(--ocean)', marginBottom: '1.5rem' }}>📊 ESG Investor Dashboard</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KpiCard label="Active Vessels" value={summary.data?.active_vessels ?? '—'} icon="🚢" />
        <KpiCard label="Verified Catch (t)" value={summary.data ? (summary.data.total_verified_kg / 1000).toFixed(1) : '—'} icon="🐟" />
        <KpiCard label="Blue Credits Issued" value={summary.data ? (summary.data.total_credits_issued / 1_000_000).toFixed(0) : '—'} icon="💎" color="var(--ocean)" />
        <KpiCard label="Avg Compliance Score" value={summary.data ? `${summary.data.avg_compliance_score}/100` : '—'} icon="✅" color="var(--green)" />
      </div>

      {/* Credits Over Time */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Blue Credits Issued Over Time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="credits" stroke="var(--ocean)" fill="var(--ocean-light)" fillOpacity={0.3} name="Credits (M)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sustainability Score Trend */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Avg Sustainability Score Trend</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="score" stroke="var(--green)" fill="var(--green)" fillOpacity={0.2} name="Score" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: color ?? 'var(--text)', marginTop: '.25rem' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{label}</div>
    </div>
  );
}
