/**
 * NegativeMovement — Phase 2 placeholder.
 */
import { TrendingDown, Construction } from 'lucide-react';

export default function NegativeMovement() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__overline">Phase 2</div>
        <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}>
            <TrendingDown size={22} />
          </div>
          Negative Movement Agent
        </h1>
        <p className="page-header__subtitle">
          Identify jobs that have negatively moved after month-end close
        </p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'rgba(245,158,11,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', color: '#f59e0b',
          }}>
            <Construction size={36} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Coming Soon
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            The Negative Movement Agent will detect jobs whose financials have worsened 
            post month-end — including increased costs, reduced revenue, or decreased profit 
            after the CMP status was set.
          </p>
          <div style={{
            marginTop: '1.5rem', padding: '0.75rem 1.25rem', borderRadius: 12,
            background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
            fontSize: '0.8rem', color: 'var(--fg-muted)',
          }}>
            Awaiting business rules from Negative Movement PoC document
          </div>
        </div>
      </div>
    </div>
  );
}
