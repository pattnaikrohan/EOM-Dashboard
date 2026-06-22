/**
 * JobTable — Sortable data table for job records.
 */
import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { Job } from '../services/api';
import { formatCurrency, STATUS_COLOURS } from '../utils/constants';
import FlagBadge from './FlagBadge';

interface JobTableProps {
  jobs: Job[];
  compact?: boolean;
}

type SortKey = keyof Job | '';
type SortDir = 'asc' | 'desc';

const columns = [
  { key: 'job_number',    label: 'Job Number',    align: 'left'  as const },
  { key: 'job_status',    label: 'Status',        align: 'left'  as const },
  { key: 'department',    label: 'Dept',           align: 'left'  as const },
  { key: 'open_date',     label: 'Open Date',      align: 'left'  as const },
  { key: 'operator',      label: 'Operator',       align: 'left'  as const },
  { key: 'revenue',       label: 'Revenue',        align: 'right' as const },
  { key: 'wip',           label: 'WIP',            align: 'right' as const },
  { key: 'cost',          label: 'Cost',           align: 'right' as const },
  { key: 'accrual',       label: 'Accrual',        align: 'right' as const },
  { key: 'profit_loss',   label: 'Profit/Loss',    align: 'right' as const },
  { key: 'margin_pct',    label: 'Margin%',        align: 'right' as const },
  { key: 'job_age_days',  label: 'Age',            align: 'right' as const },
  { key: 'flags',         label: 'Flags',          align: 'left'  as const },
];

const numericKeys = new Set(['revenue', 'wip', 'cost', 'accrual', 'profit_loss', 'margin_pct', 'job_age_days']);

export default function JobTable({ jobs, compact }: JobTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key as SortKey);
      setSortDir(numericKeys.has(key) ? 'desc' : 'asc');
    }
  };

  const sorted = [...jobs].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    let cmp: number;
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av || '').localeCompare(String(bv || ''));
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const displayCols = compact
    ? columns.filter(c => !['operator', 'open_date', 'department'].includes(c.key))
    : columns;

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {displayCols.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={sortKey === col.key ? 'sorted' : ''}
                style={{ textAlign: col.align }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  ) : (
                    <ArrowUpDown size={10} style={{ opacity: 0.3 }} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={displayCols.length} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic' }}>
                No jobs in this category
              </td>
            </tr>
          ) : (
            sorted.map((job, idx) => (
              <tr key={`${job.job_number}-${idx}`}>
                {displayCols.map(col => {
                  const val = (job as any)[col.key];
                  // Job Number
                  if (col.key === 'job_number') {
                    return <td key={col.key} className="cell-id">{val}</td>;
                  }
                  // Status
                  if (col.key === 'job_status') {
                    const cls = STATUS_COLOURS[val] || 'status-badge--default';
                    return (
                      <td key={col.key}>
                        <span className={`status-badge ${cls}`}>{val}</span>
                      </td>
                    );
                  }
                  // Flags
                  if (col.key === 'flags') {
                    return (
                      <td key={col.key}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {(val as string[]).map((f: string, i: number) => (
                            <FlagBadge key={i} flag={f} />
                          ))}
                        </div>
                      </td>
                    );
                  }
                  // Direction
                  if (col.key === 'is_export') {
                    return (
                      <td key={col.key}>
                        <span className={`direction-pill ${val ? 'direction-pill--exp' : 'direction-pill--imp'}`}>
                          {val ? '↗ EXP' : '↙ IMP'}
                        </span>
                      </td>
                    );
                  }
                  // Numeric columns
                  if (numericKeys.has(col.key)) {
                    const num = val as number;
                    if (col.key === 'margin_pct') {
                      return (
                        <td key={col.key} className={`cell-number ${num < 0 ? 'cell-number--negative' : ''}`}>
                          {num.toFixed(2)}%
                        </td>
                      );
                    }
                    if (col.key === 'job_age_days') {
                      return <td key={col.key} className="cell-number">{num}</td>;
                    }
                    return (
                      <td
                        key={col.key}
                        className={`cell-number ${num < 0 ? 'cell-number--negative' : num > 0 && col.key === 'profit_loss' ? 'cell-number--positive' : ''}`}
                      >
                        {formatCurrency(num)}
                      </td>
                    );
                  }
                  // Text
                  return <td key={col.key}>{val}</td>;
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
