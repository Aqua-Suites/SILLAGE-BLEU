'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface CatchEvent {
  catch_id: string;
  vessel_id: string;
  species: string;
  weight_kg: number;
  latitude: number;
  longitude: number;
  status: string;
  submitted_at: string;
  ipfs_evidence: string;
}

interface VesselEsg {
  vessel_id: string;
  name: string;
  flag_state: string;
  compliance_score: number;
  total_catches: number;
  total_kg: number;
  total_credits: number;
}

export default function BuyerPortal() {
  const [catchId, setCatchId] = useState('');
  const [search, setSearch] = useState('');

  const catchDetail = useQuery<CatchEvent>({
    queryKey: ['catch', search],
    queryFn: () => api.get(`/api/catch/${search}`),
    enabled: !!search,
    retry: false,
  });

  const vesselEsg = useQuery<VesselEsg>({
    queryKey: ['vessel-esg', catchDetail.data?.vessel_id],
    queryFn: () => api.get(`/api/esg/vessel/${catchDetail.data!.vessel_id}`),
    enabled: !!catchDetail.data?.vessel_id,
  });

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '700px' }}>
      <h1 style={{ color: 'var(--ocean)', marginBottom: '1.5rem' }}>🛒 Seafood Provenance Tracker</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>🔎 Verify Your Seafood</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input
            type="text"
            placeholder="Enter Catch ID or scan QR code"
            value={catchId}
            onChange={e => setCatchId(e.target.value)}
            style={{ flex: 1, padding: '.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' }}
          />
          <button className="btn btn-primary" onClick={() => setSearch(catchId)}>Search</button>
        </div>
      </div>

      {catchDetail.isLoading && <p>Searching…</p>}
      {catchDetail.isError && <div className="card" style={{ color: '#991b1b' }}>Catch not found. Check the ID and try again.</div>}

      {catchDetail.data && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Catch Details */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{catchDetail.data.species}</h2>
              <span className={`badge ${catchDetail.data.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                {catchDetail.data.status === 'approved' ? '✅ Verified' : '⏳ Pending'}
              </span>
            </div>
            <InfoRow label="Catch ID" value={catchDetail.data.catch_id} />
            <InfoRow label="Weight" value={`${catchDetail.data.weight_kg} kg`} />
            <InfoRow label="Vessel" value={catchDetail.data.vessel_id} />
            <InfoRow label="Caught On" value={new Date(catchDetail.data.submitted_at).toLocaleDateString()} />
            <InfoRow label="Location" value={`${catchDetail.data.latitude.toFixed(4)}, ${catchDetail.data.longitude.toFixed(4)}`} />
            {catchDetail.data.ipfs_evidence && (
              <InfoRow label="Evidence" value={
                <a href={`https://ipfs.io/ipfs/${catchDetail.data.ipfs_evidence}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ocean)' }}>
                  View on IPFS ↗
                </a>
              } />
            )}
          </div>

          {/* Vessel ESG Score */}
          {vesselEsg.data && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>🚢 Vessel Sustainability Profile</h3>
              <InfoRow label="Vessel Name" value={vesselEsg.data.name} />
              <InfoRow label="Flag State" value={vesselEsg.data.flag_state} />
              <div style={{ margin: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                  <span style={{ fontSize: '.875rem' }}>Compliance Score</span>
                  <strong>{vesselEsg.data.compliance_score}/100</strong>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: '999px', height: '8px' }}>
                  <div style={{ background: vesselEsg.data.compliance_score >= 70 ? 'var(--green)' : '#f59e0b', width: `${vesselEsg.data.compliance_score}%`, height: '100%', borderRadius: '999px' }} />
                </div>
              </div>
              <InfoRow label="Total Verified Catches" value={vesselEsg.data.total_catches} />
              <InfoRow label="Blue Credits Earned" value={(vesselEsg.data.total_credits / 1_000_000).toFixed(2)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '.875rem' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
