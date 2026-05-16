'use client';
import { useWallet } from '../lib/useWallet';

export default function HomePage() {
  const { address, role, connecting, connect } = useWallet();

  if (address) {
    const dashboards: Record<string, string> = {
      fisher: '/fisher',
      vessel_owner: '/fisher',
      verifier: '/regulator',
      esg_auditor: '/esg',
      admin: '/regulator',
    };
    const dest = dashboards[role ?? 'fisher'] ?? '/fisher';
    if (typeof window !== 'undefined') window.location.href = dest;
    return null;
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ocean)' }}>🌊 Sillage Bleu</h1>
        <p style={{ color: 'var(--muted)', marginTop: '.5rem' }}>Blue Economy Verification & Ocean Carbon Credits</p>
      </div>

      <div style={{ display: 'grid', gap: '1rem', width: '100%', maxWidth: '400px' }}>
        <RoleCard icon="🎣" title="Fisher Dashboard" desc="Log catches, track earnings, view verification status" />
        <RoleCard icon="🛒" title="Buyer Portal" desc="Verify seafood provenance and sustainability scores" />
        <RoleCard icon="📊" title="ESG Investor" desc="Blue carbon credits and ocean impact analytics" />
        <RoleCard icon="🔍" title="Regulator" desc="Compliance monitoring and fraud detection" />
      </div>

      <button className="btn btn-primary" onClick={connect} disabled={connecting} style={{ fontSize: '1.1rem', padding: '.75rem 2rem' }}>
        {connecting ? 'Connecting…' : '🔗 Connect Freighter Wallet'}
      </button>
    </main>
  );
}

function RoleCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: 'var(--muted)', fontSize: '.875rem' }}>{desc}</div>
      </div>
    </div>
  );
}
