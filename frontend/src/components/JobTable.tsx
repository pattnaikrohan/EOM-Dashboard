/**
 * JobTable — High-Performance sortable data table with DOM Virtualization/Pagination.
 * Keeps 100% of job data & calculations intact in memory, but renders only visible
 * rows (default 50 per page) for 0ms lightning-fast tab switching and smooth scrolling.
 */
import { useState, Fragment, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Job } from '../services/api';
import { formatCurrency, formatDate, STATUS_COLOURS } from '../utils/constants';
import FlagBadge from './FlagBadge';

interface JobTableProps {
  jobs: Job[];
  compact?: boolean;
  hideRevenueProfit?: boolean;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
}

type SortKey = keyof Job | '';
type SortDir = 'asc' | 'desc';

const columns = [
  { key: 'job_number',    label: 'Job Number',    align: 'left'  as const },
  { key: 'job_status',    label: 'Status',        align: 'left'  as const },
  { key: 'department',    label: 'Dept',           align: 'left'  as const },
  { key: 'local_client',  label: 'Client Code',    align: 'left'  as const },
  { key: 'etd',           label: 'ETD',            align: 'left'  as const },
  { key: 'eta',           label: 'ETA',            align: 'left'  as const },
  { key: 'operator',      label: 'Operator',       align: 'left'  as const },
  { key: 'revenue',       label: 'Revenue',        align: 'right' as const },
  { key: 'wip',           label: 'WIP',            align: 'right' as const },
  { key: 'cost',          label: 'Cost',           align: 'right' as const },
  { key: 'accrual',       label: 'Accrual',        align: 'right' as const },
  { key: 'profit_loss',   label: 'Profit/Loss',    align: 'right' as const },
  { key: 'margin_pct',    label: 'Margin%',        align: 'right' as const },
  { key: 'accrual_age_days', label: 'Acr Age',     align: 'right' as const },
  { key: 'flags',         label: 'Flags',          align: 'left'  as const },
];

const numericKeys = new Set(['revenue', 'wip', 'cost', 'accrual', 'profit_loss', 'margin_pct', 'job_age_days', 'accrual_age_days']);
const dateKeys = new Set(['etd', 'eta']);

/** Parse a date string (YYYY-MM-DD or DD/MM/YYYY) to a sortable timestamp */
function parseDateForSort(val: string | null | undefined): number {
  if (!val || val === '-' || val === 'None') return 0;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(s).getTime() || 0;
  }
  const parts = s.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
  }
  return 0;
}

export default function JobTable({ jobs, compact, hideRevenueProfit, defaultSort, pageSize: initialPageSize = 50 }: JobTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort?.key as SortKey || '');
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir || 'asc');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Reset to page 1 whenever jobs array length or sort changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows({});
  }, [jobs.length, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key as SortKey);
      setSortDir(numericKeys.has(key) ? 'desc' : 'asc');
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const sorted = [...jobs].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    let cmp: number;
    if (dateKeys.has(sortKey)) {
      cmp = parseDateForSort(av) - parseDateForSort(bv);
    } else if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av || '').localeCompare(String(bv || ''));
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Calculate pagination slice
  const totalItems = sorted.length;
  const isAll = pageSize >= totalItems || pageSize === -1;
  const totalPages = isAll ? 1 : Math.ceil(totalItems / pageSize);
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = isAll ? 0 : (validPage - 1) * pageSize;
  const endIndex = isAll ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const visibleJobs = sorted.slice(startIndex, endIndex);

  const displayCols = columns.filter(c => {
    if (compact && ['operator'].includes(c.key)) return false;
    if (hideRevenueProfit && ['revenue', 'margin_pct'].includes(c.key)) return false;
    return true;
  });

  return (
    <div className="data-table-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
          {totalItems === 0 ? (
            <tr>
              <td colSpan={displayCols.length} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic' }}>
                No jobs in this category
              </td>
            </tr>
          ) : (
            visibleJobs.map((job, idx) => {
              const globalIdx = startIndex + idx;
              const hasSubLines = (Math.abs(job.accrual || 0) > 0 || ((job.accrual_age_days || 0) > 0)) && 
                                  Array.isArray(job.accrual_lines) && 
                                  job.accrual_lines.length > 0;
              const isExpanded = !!expandedRows[globalIdx];

              return (
                <Fragment key={`${job.job_number}-${globalIdx}`}>
                  <tr
                    onClick={() => hasSubLines && toggleExpand(globalIdx)}
                    style={{ cursor: hasSubLines ? 'pointer' : 'default', background: isExpanded ? 'var(--bg-subtle)' : undefined }}
                  >
                    {displayCols.map(col => {
                      const val = (job as any)[col.key];
                      // Job Number
                      if (col.key === 'job_number') {
                        return (
                          <td key={col.key} className="cell-id" style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {hasSubLines && (
                                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                              )}
                              <span>{val}</span>
                            </div>
                          </td>
                        );
                      }
                      // Status
                      if (col.key === 'job_status') {
                        const cls = STATUS_COLOURS[val] || 'status-badge--default';
                        return (
                          <td key={col.key} style={{ whiteSpace: 'nowrap' }}>
                            <span className={`status-badge ${cls}`}>{val}</span>
                          </td>
                        );
                      }
                      // Flags
                      if (col.key === 'flags') {
                        return (
                          <td key={col.key}>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {(val as string[] || []).map((f: string, i: number) => (
                                <FlagBadge key={i} flag={f} />
                              ))}
                            </div>
                          </td>
                        );
                      }
                      // Numeric columns
                      if (numericKeys.has(col.key)) {
                        const num = (val as number) || 0;
                        if (col.key === 'margin_pct') {
                          return (
                            <td key={col.key} className={`cell-number ${num < 0 ? 'cell-number--negative' : ''}`}>
                              {num.toFixed(2)}%
                            </td>
                          );
                        }
                        if (col.key === 'accrual_age_days' || col.key === 'job_age_days') {
                          const hasAccrual = Math.abs(job.accrual || 0) > 0 || ((job.accrual_lines?.length || 0) > 0);
                          const acrAge = (job as any).accrual_age_days;
                          if (hasAccrual && typeof acrAge === 'number' && acrAge > 0) {
                            return (
                              <td key={col.key} className="cell-number" title={`Accrual age: ${acrAge} days`}>
                                {acrAge}
                              </td>
                            );
                          }
                          return (
                            <td key={col.key} className="cell-number" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>
                              N/A
                            </td>
                          );
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
                      // Text & Dates
                      const isDate = dateKeys.has(col.key);
                      if (isDate) {
                        return <td key={col.key} style={{ whiteSpace: 'nowrap' }}>{formatDate(val)}</td>;
                      }
                      return <td key={col.key}>{val || '-'}</td>;
                    })}
                  </tr>
                  {isExpanded && hasSubLines && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={displayCols.length} style={{ padding: '0.75rem 1.5rem', borderBottom: '2px solid #e2e8f0' }}>
                        <div className="fade-in">
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Aged Accrual Breakdown ({job.accrual_lines!.length} {job.accrual_lines!.length === 1 ? 'line' : 'lines'})</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Ageing measured by ACR Recognised date</span>
                          </div>
                          <table className="data-table" style={{ margin: 0, fontSize: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Job Number</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Charge Code</th>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Creditor</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>OS Cur</th>
                                <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>OS Amount</th>
                                <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>Ex Rate</th>
                                <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>Cost Local (AUD)</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>Has ACR</th>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>ACR Recognised</th>
                                <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>Age (Days)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {job.accrual_lines!.map((line, lIdx) => (
                                <tr key={lIdx}>
                                  <td className="cell-id" style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{job.job_number}</td>
                                  <td style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>
                                    <span className={`status-badge ${STATUS_COLOURS[job.job_status] || 'status-badge--default'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                                      {job.job_status}
                                    </span>
                                  </td>
                                  <td className="cell-id" style={{ padding: '0.4rem 0.6rem' }}>{line.charge_code || '-'}</td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{line.creditor || '-'}</td>
                                  <td style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>{line.os_cur || '-'}</td>
                                  <td className="cell-number" style={{ padding: '0.4rem 0.6rem' }}>{line.os_amount ? line.os_amount.toFixed(2) : '0.00'}</td>
                                  <td className="cell-number" style={{ padding: '0.4rem 0.6rem' }}>{line.ex_rate ? line.ex_rate.toFixed(4) : '1.0000'}</td>
                                  <td className="cell-number" style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{formatCurrency(line.cost_local || 0)}</td>
                                  <td style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>{line.has_acr || 'Y'}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>{formatDate(line.acr_recognised)}</td>
                                  <td className="cell-number" style={{ padding: '0.4rem 0.6rem', color: (line.age_days || 0) >= 90 ? '#d97706' : undefined, fontWeight: (line.age_days || 0) >= 90 ? 700 : 400 }}>
                                    {line.age_days || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 1rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#475569',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong> to <strong style={{ color: '#0f172a' }}>{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems.toLocaleString()}</strong> jobs
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  const val = Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={totalItems}>All ({totalItems})</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  disabled={validPage === 1}
                  onClick={() => setCurrentPage(1)}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: validPage === 1 ? '#f1f5f9' : '#fff',
                    cursor: validPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: validPage === 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  disabled={validPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: validPage === 1 ? '#f1f5f9' : '#fff',
                    cursor: validPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: validPage === 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span style={{ margin: '0 0.5rem', fontWeight: 600, color: '#0f172a' }}>
                  Page {validPage} of {totalPages}
                </span>

                <button
                  disabled={validPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: validPage === totalPages ? '#f1f5f9' : '#fff',
                    cursor: validPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: validPage === totalPages ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  disabled={validPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: validPage === totalPages ? '#f1f5f9' : '#fff',
                    cursor: validPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: validPage === totalPages ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
