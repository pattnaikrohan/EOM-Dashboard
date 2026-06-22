/**
 * KPICards — Summary metric cards row.
 */
import {
  Briefcase, ArrowUpRight, ArrowDownLeft, AlertCircle,
  Layers, TrendingDown
} from 'lucide-react';
import type { KPI } from '../services/api';
import { formatCurrency } from '../utils/constants';

interface KPICardsProps {
  kpi: KPI;
}

export default function KPICards({ kpi }: KPICardsProps) {
  const cards = [
    { label: 'Total Jobs',   value: kpi.total_jobs,       icon: Briefcase,     variant: 'blue',   isCurrency: false },
    { label: 'Export',        value: kpi.export_jobs,      icon: ArrowUpRight,  variant: 'indigo', isCurrency: false },
    { label: 'Import',        value: kpi.import_jobs,      icon: ArrowDownLeft, variant: 'purple', isCurrency: false },
    { label: 'Has WIP',       value: kpi.has_wip,          icon: Layers,        variant: 'amber',  isCurrency: false },
    { label: 'Loss Jobs',     value: kpi.loss_jobs,        icon: TrendingDown,  variant: 'red',    isCurrency: false },
    { label: 'No Revenue',    value: kpi.no_revenue,       icon: AlertCircle,   variant: 'amber',  isCurrency: false },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`kpi-card kpi-card--${card.variant} fade-in`}>
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
  );
}
