/**
 * Settings — Legend page showing flag definitions.
 */
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { getLegend } from '../services/api';
import type { LegendItem } from '../services/api';
import { FLAG_COLOURS } from '../utils/constants';

export default function SettingsPage() {
  const [legend, setLegend] = useState<LegendItem[]>([]);

  useEffect(() => {
    getLegend().then(d => setLegend(d.legend)).catch(() => {
      // Fallback to local constants
      setLegend(Object.entries(FLAG_COLOURS).map(([flag, info]) => ({
        flag,
        colour: info.colour,
        hex_code: info.hex,
        rule: '',
      })));
    });
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__overline">Configuration</div>
        <h1 className="page-header__title">Settings & Flag Legend</h1>
        <p className="page-header__subtitle">
          Flag colour definitions and business rule reference
        </p>
      </div>

      <div className="card">
        <h3 style={{
          fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Info size={16} color="#3b82f6" />
          Flag Colour Legend
        </h3>

        <div className="legend-grid">
          {legend.map(item => (
            <div key={item.flag} className="legend-item">
              <div
                className="legend-swatch"
                style={{ background: item.hex_code }}
              />
              <span className="legend-label">{item.flag}</span>
              <span className="legend-rule">{item.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing checklist */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{
          fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Info size={16} color="#10b981" />
          Billing Quick Check Checklist
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            'Correct department / entity on job',
            'Costing sheet cross-checked',
            'Quote cross-checked (rates & scope)',
            'All sell lines raised',
            'All known costs accrued',
            'Job profit looks reasonable',
            'FLA amount confirmed',
            'EFS amount confirmed (if applicable)',
            'Correct currency used per customer',
            'Fixed FX rate checked (creditor & debtor aligned)',
            'Invoice descriptions clean and client-ready',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 1rem', borderRadius: 10,
              background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
              fontSize: '0.8125rem', color: 'var(--fg-base)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                border: '2px solid var(--border-base)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '0.65rem', fontWeight: 800, color: 'var(--fg-faint)',
              }}>
                {i + 1}
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
