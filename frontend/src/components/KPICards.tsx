/**
 * KPICards — Summary metric cards row.
 */
import { useState } from 'react';
import {
  Briefcase, ArrowUpRight, ArrowDownLeft, AlertCircle,
  Layers, TrendingDown, X, Repeat
} from 'lucide-react';
import type { KPI } from '../services/api';
import { formatCurrency } from '../utils/constants';

interface KPICardsProps {
  kpi: KPI;
}

export default function KPICards({ kpi }: KPICardsProps) {
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const cards = [
    { label: 'Total Jobs',   value: kpi.total_jobs,       icon: Briefcase,     variant: 'blue',   isCurrency: false, description: 'Total number of active jobs currently assigned to the operators in this view.' },
    { label: 'Export',        value: kpi.export_jobs,      icon: ArrowUpRight,  variant: 'indigo', isCurrency: false, description: 'Total number of jobs marked as Export direction (e.g., EX, OEX, AEX).' },
    { label: 'Cross-Trade',   value: kpi.cross_trade_jobs, icon: Repeat,        variant: 'violet', isCurrency: false, description: 'Jobs where both origin and destination are outside Australia (Cross-Trade shipments).' },
    { label: 'Import',        value: kpi.import_jobs,      icon: ArrowDownLeft, variant: 'purple', isCurrency: false, description: 'Total number of jobs marked as Import direction (e.g., IM, OIM, AIM).' },
    { label: 'Has WIP',       value: kpi.has_wip,          icon: Layers,        variant: 'amber',  isCurrency: false, description: 'Number of jobs where the Work In Progress (WIP) balance is not exactly zero, indicating pending costs or unbilled items.' },
    { label: 'Loss Jobs',     value: kpi.loss_jobs,        icon: TrendingDown,  variant: 'red',    isCurrency: false, description: 'Jobs where the total Profit/Loss is strictly less than -$40.' },
    { label: 'No Revenue',    value: kpi.no_revenue,       icon: AlertCircle,   variant: 'amber',  isCurrency: false, description: 'Jobs where the recognized revenue is exactly $0.' },
  ];

  return (
    <>
      <div className="kpi-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.label} 
              className={`kpi-card kpi-card--${card.variant} fade-in`}
              onClick={() => setSelectedCard(card)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`kpi-card__icon kpi-card__icon--${card.variant}`}>
                <Icon size={20} />
              </div>
              <div className="kpi-card__value">
                {card.isCurrency ? formatCurrency(card.value) : card.value.toLocaleString()}
              </div>
              <div className="kpi-card__label">{card.label}</div>
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} 
          onClick={() => setSelectedCard(null)}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', background: '#fff', border: `1px solid var(--border-base)`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={`kpi-card__icon kpi-card__icon--${selectedCard.variant}`} style={{ margin: 0 }}>
                  <selectedCard.icon size={24} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{selectedCard.label}</h3>
              </div>
              <button onClick={() => setSelectedCard(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.25rem', color: '#0f172a' }}>
              {selectedCard.isCurrency ? formatCurrency(selectedCard.value) : selectedCard.value.toLocaleString()}
            </div>
            
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#0f172a' }}>How is this calculated?</strong>
              {selectedCard.description}
            </div>

            {kpi.total_jobs > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  <span>Percentage of Total Jobs</span>
                  <span style={{ color: '#0f172a' }}>{((selectedCard.value / kpi.total_jobs) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(selectedCard.value / kpi.total_jobs) * 100}%`, height: '100%', background: '#2563EB', borderRadius: '4px', transition: 'width 1s ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
