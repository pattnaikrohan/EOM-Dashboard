/**
 * KPICards — Summary metric cards grouped by logical operational, financial, and risk categories.
 * Separated into clean rows with section headers for maximum readability and visual hierarchy.
 */
import { useState } from 'react';
import {
  Briefcase, ArrowUpRight, ArrowDownLeft, AlertCircle,
  Layers, TrendingDown, X, Repeat, DollarSign, Activity, AlertTriangle
} from 'lucide-react';
import type { KPI } from '../services/api';
import { formatCurrency } from '../utils/constants';

interface KPICardsProps {
  kpi: KPI;
}

export default function KPICards({ kpi }: KPICardsProps) {
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const sections = [
    {
      title: 'OPERATIONAL VOLUMES & DIRECTION',
      cards: [
        {
          label: 'Total Active Jobs',
          value: kpi.total_jobs,
          icon: Briefcase,
          variant: 'blue',
          isCurrency: false,
          description: 'Total number of active jobs currently loaded in the dashboard for the selected filters.'
        },
        {
          label: 'Action Required Jobs',
          value: kpi.visible_jobs !== undefined ? kpi.visible_jobs : kpi.total_jobs,
          icon: AlertTriangle,
          variant: 'amber',
          isCurrency: false,
          description: 'Jobs requiring EOM action (pending invoicing, WIPs, aged accruals, or INV status).'
        },
        {
          label: 'Import Jobs',
          value: kpi.import_jobs,
          icon: ArrowDownLeft,
          variant: 'purple',
          isCurrency: false,
          description: 'Shipments imported into Australia/New Zealand (e.g., IM, OIM, AIM).'
        },
        {
          label: 'Export Jobs',
          value: kpi.export_jobs,
          icon: ArrowUpRight,
          variant: 'indigo',
          isCurrency: false,
          description: 'Shipments exported from Australia/New Zealand (e.g., EX, OEX, AEX).'
        },
        {
          label: 'Cross-Trade Jobs',
          value: kpi.cross_trade_jobs,
          icon: Repeat,
          variant: 'violet',
          isCurrency: false,
          description: 'Shipments where both origin and destination are outside the home country.'
        },
      ]
    },
    {
      title: 'FINANCIAL OVERVIEW',
      cards: [
        {
          label: 'Total Revenue',
          value: kpi.total_revenue || 0,
          icon: DollarSign,
          variant: 'emerald',
          isCurrency: true,
          description: 'Total recognized revenue across all active jobs in the current view.'
        },
        {
          label: 'Total Profit',
          value: kpi.total_profit || 0,
          icon: Activity,
          variant: 'emerald',
          isCurrency: true,
          description: 'Net profit (Revenue - Cost) recognized across all jobs.'
        },
        {
          label: 'WIP Balance Value',
          value: kpi.total_wip || 0,
          icon: Layers,
          variant: 'amber',
          isCurrency: true,
          description: 'Total dollar amount currently sitting in Work In Progress (WIP).'
        },
      ]
    },
    {
      title: 'RISK & EXCEPTION FLAGS',
      cards: [
        {
          label: 'Unbilled Jobs (No Revenue)',
          value: kpi.no_revenue,
          icon: AlertCircle,
          variant: 'amber',
          isCurrency: false,
          description: 'Jobs where the recognized revenue is currently $0.00 and requiring billing.'
        },
        {
          label: 'Jobs with WIP Balance',
          value: kpi.has_wip,
          icon: Layers,
          variant: 'amber',
          isCurrency: false,
          description: 'Jobs where the Work In Progress (WIP) balance is greater than $40.'
        },
        {
          label: 'Billed Loss Jobs',
          value: kpi.loss_jobs,
          icon: TrendingDown,
          variant: 'red',
          isCurrency: false,
          description: 'Jobs operating at a financial loss (Profit strictly less than -$40).'
        },
        {
          label: 'Low Margin Jobs (<5%)',
          value: kpi.margin_below_5 || 0,
          icon: AlertCircle,
          variant: 'red',
          isCurrency: false,
          description: 'Billed jobs where profit margin is below 5% at CMP/IHL status.'
        },
      ]
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {sections.map((sec) => (
          <div key={sec.title}>
            <div style={{
              fontSize: '0.725rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#64748b',
              marginBottom: '0.6rem',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>{sec.title}</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}>
              {sec.cards.map((card) => {
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
          </div>
        ))}
      </div>

      {/* Metric Detail Modal */}
      {selectedCard && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setSelectedCard(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem', borderRadius: '50%' }}
              onClick={() => setSelectedCard(null)}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className={`kpi-card__icon kpi-card__icon--${selectedCard.variant}`}>
                <selectedCard.icon size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{selectedCard.label}</h3>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                  {selectedCard.isCurrency ? formatCurrency(selectedCard.value) : selectedCard.value.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {selectedCard.description}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
