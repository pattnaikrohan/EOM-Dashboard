/**
 * NegativeMovement — Full implementation with 3 collapsible sections,
 * KPI cards, commentary workflow, and upload functionality.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingDown, TrendingUp, AlertTriangle, Upload, ChevronRight, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, Clock, Save, ArrowRight,
  AlertCircle
} from 'lucide-react';
import {
  getNegMovementSummary, getNegMovementJobs, getNegMovementStatus,
  uploadNegMovementFiles, updateNegMovementComment
} from '../services/api';
import type { NegMovementJob, NegMovementSummary, NegMovementSectionSummary } from '../services/api';
import PremiumLoader from '../components/PremiumLoader';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/constants';

// ── Section config ────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'negative_movement',
    title: 'Negative Movement > $250',
    subtitle: 'Jobs where accrued cost variance exceeds AUD $250',
    colour: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icon: TrendingDown,
  },
  {
    key: 'excess_profit',
    title: 'Excess Profit > $5,000',
    subtitle: 'Jobs with unusually high profit margins',
    colour: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    icon: TrendingUp,
  },
  {
    key: 'jobs_with_losses',
    title: 'Jobs with Losses',
    subtitle: 'Closed jobs carrying a loss',
    colour: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    icon: AlertTriangle,
  },
] as const;

const STATUS_CONFIG: Record<string, { label: string; colour: string; bg: string }> = {
  pending:   { label: 'Pending',   colour: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  responded: { label: 'Responded', colour: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  reviewed:  { label: 'Reviewed',  colour: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  closed:    { label: 'Closed',    colour: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

type SortKey = keyof NegMovementJob | '';
type SortDir = 'asc' | 'desc';

// ── Main Component ────────────────────────────────────────────────────────────
export default function NegativeMovement() {
  const { globalBranches, getTabCache, setTabCache } = useData();
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NegMovementSummary | null>(null);
  const [plCategories, setPlCategories] = useState<string[]>([]);
  const [sectionJobs, setSectionJobs] = useState<Record<string, NegMovementJob[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    negative_movement: true,
    excess_profit: true,
    jobs_with_losses: true,
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const loadData = useCallback(async () => {
    const cacheKey = `neg_movement_${(globalBranches || []).join(',')}`;
    const cached = getTabCache('negMovement', cacheKey);
    if (cached) {
      setLoaded(cached.loaded);
      setSummary(cached.summary);
      setPlCategories(cached.plCategories);
      setSectionJobs(cached.sectionJobs);
      setLoading(false);
      return;
    }

    try {
      const statusResp = await getNegMovementStatus();
      setLoaded(statusResp.loaded);
      setPlCategories(statusResp.pl_categories || []);

      if (statusResp.loaded) {
        const summaryResp = await getNegMovementSummary();
        const jobs: Record<string, NegMovementJob[]> = {};
        for (const sec of SECTIONS) {
          const resp = await getNegMovementJobs(sec.key);
          jobs[sec.key] = resp.jobs;
        }

        setSummary(summaryResp.summary);
        setPlCategories(summaryResp.pl_categories || []);
        setSectionJobs(jobs);

        setTabCache('negMovement', cacheKey, {
          loaded: statusResp.loaded,
          summary: summaryResp.summary,
          branch: summaryResp.branch,
          period: summaryResp.period,
          plCategories: statusResp.pl_categories || [],
          sectionJobs: jobs,
        });
      }
    } catch (err) {
      console.error('Failed to load neg movement data:', err);
    } finally {
      setLoading(false);
    }
  }, [globalBranches, getTabCache, setTabCache]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const fileArray = Array.from(files);
      const resp = await uploadNegMovementFiles(fileArray);
      setUploadMsg(resp.message || 'Upload successful');
      await loadData();
    } catch (err: any) {
      setUploadMsg(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCommentSave = async (job: NegMovementJob, comment: string, category: string, notesHo: string, status: string) => {
    try {
      const resp = await updateNegMovementComment(job.job_number, {
        section: job.section,
        comment,
        category,
        notes_ho: notesHo,
        resolution_status: status,
      });
      if (resp.success) {
        // Update local state
        setSectionJobs(prev => {
          const updated = { ...prev };
          updated[job.section] = updated[job.section].map(j =>
            j.job_number === job.job_number ? resp.job : j
          );
          return updated;
        });
        // Refresh summary
        const summaryResp = await getNegMovementSummary();
        setSummary(summaryResp.summary);
      }
    } catch (err) {
      console.error('Failed to save comment:', err);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return <PremiumLoader text="Loading Negative Movement data..." />;
  }

  // ── Upload State (no data loaded) ──────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="page-header__overline">Negative Movement</div>
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
            Upload the Negative Movement Excel report to begin
          </p>
        </div>

        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <label
              htmlFor="neg-upload"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                padding: '3rem 2rem', borderRadius: 16,
                border: '2px dashed rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.04)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ef4444'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'rgba(239,68,68,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Upload size={28} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Drop Negative Movement Report here
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  or click to browse — .xlsx files only
                </div>
              </div>
            </label>
            <input
              id="neg-upload"
              type="file"
              multiple
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files)}
            />
            {uploading && (
              <div style={{ marginTop: '1rem', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600 }}>
                Processing file...
              </div>
            )}
            {uploadMsg && (
              <div style={{
                marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 10,
                background: uploadMsg.includes('failed') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                color: uploadMsg.includes('failed') ? '#ef4444' : '#22c55e',
                fontSize: '0.85rem', fontWeight: 600,
              }}>
                {uploadMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Data Loaded — Full Dashboard ───────────────────────────────────────────
  const neg = summary?.negative_movement;
  const exc = summary?.excess_profit;
  const loss = summary?.jobs_with_losses;
  const totalJobs = summary?.total_jobs || 0;
  const totalResolved = (neg?.responded || 0) + (neg?.reviewed || 0) + (neg?.closed || 0)
    + (exc?.responded || 0) + (exc?.reviewed || 0) + (exc?.closed || 0)
    + (loss?.responded || 0) + (loss?.reviewed || 0) + (loss?.closed || 0);
  const progressPct = totalJobs > 0 ? Math.round((totalResolved / totalJobs) * 100) : 0;

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__overline">Negative Movement Report</div>
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
          {totalJobs} jobs flagged for review
        </p>
      </div>

      {/* Upload new file button */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <label htmlFor="neg-re-upload" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: 10,
          background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)',
          transition: 'all 0.15s',
        }}>
          <Upload size={14} />
          Upload New Report
        </label>
        <input
          id="neg-re-upload"
          type="file"
          multiple
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />
        {uploading && <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Processing...</span>}
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <KPICard
          title="Negative Movement"
          value={formatCurrency(neg?.total_profit || 0)}
          count={neg?.count || 0}
          colour="#ef4444"
          gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
          icon={<TrendingDown size={20} />}
        />
        <KPICard
          title="Excess Profit"
          value={formatCurrency(exc?.total_profit || 0)}
          count={exc?.count || 0}
          colour="#10b981"
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          icon={<TrendingUp size={20} />}
        />
        <KPICard
          title="Jobs with Losses"
          value={formatCurrency(loss?.total_profit || 0)}
          count={loss?.count || 0}
          colour="#f59e0b"
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          icon={<AlertTriangle size={20} />}
        />
        <div className="card" style={{
          padding: '1.4rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-base)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--fg-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Resolution Progress
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: progressPct === 100 ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                color: progressPct === 100 ? '#10b981' : '#3b82f6',
              }}>
                {progressPct}% Done
              </span>
            </div>
            <div style={{
              fontSize: 'clamp(1.4rem, 2vw, 1.85rem)',
              fontWeight: 900,
              color: 'var(--fg-base)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}>
              {totalResolved.toLocaleString()} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--fg-muted)' }}>/ {totalJobs.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div style={{
              height: 8,
              borderRadius: 9999,
              background: 'var(--bg-subtle)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 9999,
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                boxShadow: '0 0 12px rgba(59,130,246,0.5)',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.725rem',
              color: 'var(--fg-muted)',
              marginTop: '0.5rem',
              fontWeight: 600,
            }}>
              <span>{totalJobs - totalResolved} jobs remaining</span>
              {summary?.overdue_count ? (
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{summary.overdue_count} overdue</span>
              ) : (
                <span style={{ color: '#10b981', fontWeight: 700 }}>0 overdue</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map(sec => {
        const jobs = sectionJobs[sec.key] || [];
        const secSummary = summary?.[sec.key as keyof NegMovementSummary] as NegMovementSectionSummary | undefined;
        const isOpen = expanded[sec.key] ?? true;
        const Icon = sec.icon;

        return (
          <div key={sec.key} className="card" style={{ marginBottom: '1rem', borderLeftColor: sec.colour, borderLeftWidth: 3 }}>
            {/* Section Header */}
            <div
              className="card__header"
              onClick={() => setExpanded(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
              style={{ cursor: 'pointer' }}
            >
              <div className="card__header-left">
                <div className="card__header-icon" style={{
                  background: `${sec.colour}18`, borderColor: `${sec.colour}30`, color: sec.colour,
                }}>
                  <Icon size={16} />
                </div>
                <span className="card__title">{sec.title}</span>
                <span className="card__count" style={{ background: `${sec.colour}15`, color: sec.colour }}>
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
                {secSummary && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: secSummary.total_profit < 0 ? '#ef4444' : '#22c55e',
                    marginLeft: '0.5rem',
                  }}>
                    {formatCurrency(secSummary.total_profit)}
                  </span>
                )}
                {secSummary && secSummary.pending > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    fontSize: '0.7rem', fontWeight: 600, color: '#f59e0b',
                    background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6, marginLeft: '0.5rem',
                  }}>
                    <Clock size={10} /> {secSummary.pending} pending
                  </span>
                )}
              </div>
              <ChevronRight
                size={16}
                style={{
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  color: 'var(--fg-muted)',
                }}
              />
            </div>

            {/* Section Body */}
            {isOpen && (
              <NegMovementTable
                jobs={jobs}
                plCategories={plCategories}
                expandedRow={expandedRow}
                setExpandedRow={setExpandedRow}
                onSaveComment={handleCommentSave}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ title, value, count, colour, gradient, icon }: {
  title: string; value: string; count: number; colour: string; gradient: string; icon: React.ReactNode;
}) {
  return (
    <div className="card" style={{
      padding: '1.4rem',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '16px',
      background: 'var(--bg-base)',
      border: '1px solid var(--border-base)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute', top: -15, right: -15, width: 85, height: 85,
        borderRadius: '50%', background: `${colour}12`, filter: 'blur(10px)',
        pointerEvents: 'none',
      }} />

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: gradient,
      }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: `0 4px 14px ${colour}35`,
            }}>
              {icon}
            </div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--fg-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              {title}
            </div>
          </div>
        </div>

        {/* Responsive, unclipped value */}
        <div style={{
          fontSize: 'clamp(1.25rem, 1.8vw, 1.7rem)',
          fontWeight: 900,
          color: 'var(--fg-base)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '0.5rem',
        }} title={value}>
          {value}
        </div>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.73rem',
        fontWeight: 700,
        color: colour,
        background: `${colour}12`,
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        width: 'fit-content',
      }}>
        <span>●</span>
        <span>{count.toLocaleString()} {count === 1 ? 'job' : 'jobs'} flagged</span>
      </div>
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────────
const TABLE_COLS = [
  { key: 'job_number',    label: 'Job Number', align: 'left'  as const },
  { key: 'status',        label: 'Status',     align: 'left'  as const },
  { key: 'department',    label: 'Dept',       align: 'left'  as const },
  { key: 'assigned_to',   label: 'Assigned To (Operator)', align: 'left' as const },
  { key: 'local_client',  label: 'Client',     align: 'left'  as const },
  { key: 'route',         label: 'Route',      align: 'left'  as const },
  { key: 'transport',     label: 'Mode',       align: 'left'  as const },
  { key: 'etd',           label: 'ETD',        align: 'left'  as const },
  { key: 'eta',           label: 'ETA',        align: 'left'  as const },
  { key: 'revenue',       label: 'Revenue',    align: 'right' as const },
  { key: 'cost',          label: 'Cost',       align: 'right' as const },
  { key: 'wip',           label: 'WIP',        align: 'right' as const },
  { key: 'accrual',       label: 'Accrual',    align: 'right' as const },
  { key: 'job_profit',    label: 'P&L / Movement', align: 'right' as const },
  { key: 'margin_pct',    label: 'Margin%',    align: 'right' as const },
  { key: 'resolution_status', label: 'Review',  align: 'center' as const },
];

const NUMERIC_KEYS = new Set(['job_profit', 'revenue', 'cost', 'accrual', 'wip', 'margin_pct']);

function NegMovementTable({ jobs, plCategories, expandedRow, setExpandedRow, onSaveComment }: {
  jobs: NegMovementJob[];
  plCategories: string[];
  expandedRow: string | null;
  setExpandedRow: (key: string | null) => void;
  onSaveComment: (job: NegMovementJob, comment: string, category: string, notesHo: string, status: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key as SortKey);
      setSortDir(NUMERIC_KEYS.has(key) ? 'desc' : 'asc');
    }
  };

  const sorted = [...jobs].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    let cmp: number;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av || '').localeCompare(String(bv || ''));
    return sortDir === 'desc' ? -cmp : cmp;
  });

  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
        No jobs in this section
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            {TABLE_COLS.map(col => (
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
          {sorted.map((job) => {
            const rowKey = `${job.section}:${job.job_number}`;
            const isExpanded = expandedRow === rowKey;
            const statusConf = STATUS_CONFIG[job.resolution_status] || STATUS_CONFIG.pending;
            const mode = [job.transport, job.container].filter(Boolean).join(' ') || '—';

            return (
              <CommentableRow
                key={rowKey}
                job={job}
                isExpanded={isExpanded}
                statusConf={statusConf}
                mode={mode}
                plCategories={plCategories}
                onToggle={() => setExpandedRow(isExpanded ? null : rowKey)}
                onSave={onSaveComment}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Commentable Row ───────────────────────────────────────────────────────────
function CommentableRow({ job, isExpanded, statusConf, mode, plCategories, onToggle, onSave }: {
  job: NegMovementJob;
  isExpanded: boolean;
  statusConf: { label: string; colour: string; bg: string };
  mode: string;
  plCategories: string[];
  onToggle: () => void;
  onSave: (job: NegMovementJob, comment: string, category: string, notesHo: string, status: string) => void;
}) {
  const [comment, setComment] = useState(job.comment || '');
  const [category, setCategory] = useState(job.category || '');
  const [notesHo, setNotesHo] = useState(job.notes_ho || '');
  const [status, setStatus] = useState(job.resolution_status || 'pending');
  const [saving, setSaving] = useState(false);
  const isClosed = job.resolution_status === 'closed';

  // Calculate overdue: pending for > 48 hours
  const isOverdue = (() => {
    if (job.resolution_status !== 'pending' || !job.created_at) return false;
    try {
      const created = new Date(job.created_at).getTime();
      const now = Date.now();
      return (now - created) > 48 * 60 * 60 * 1000;
    } catch { return false; }
  })();

  const handleSave = async () => {
    setSaving(true);
    await onSave(job, comment, category, notesHo, status);
    setSaving(false);
  };

  const colSpan = TABLE_COLS.length + 1;

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg-subtle)' : undefined,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)'; }}
        onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = ''; }}
      >
        <td style={{ width: 32, textAlign: 'center' }}>
          {isExpanded
            ? <ChevronDown size={14} color="var(--fg-muted)" />
            : <MessageSquare size={14} color={job.comment ? '#3b82f6' : 'var(--fg-muted)'} />
          }
        </td>
        <td className="cell-id">{job.job_number}</td>
        <td>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            fontSize: '0.7rem', fontWeight: 700,
            background: job.status === 'CMP' ? 'rgba(34,197,94,0.1)' : job.status === 'CLS' ? 'rgba(100,116,139,0.1)' : 'rgba(59,130,246,0.1)',
            color: job.status === 'CMP' ? '#16a34a' : job.status === 'CLS' ? '#475569' : '#2563eb',
          }}>
            {job.status}
          </span>
        </td>
        <td>{job.department}</td>
        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }} title={job.assigned_to}>
          {job.assigned_to || '—'}
        </td>
        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.local_client}>
          {job.local_client}
        </td>
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}>
            {job.origin && <span>{job.origin}</span>}
            {job.origin && job.destination && <ArrowRight size={10} color="var(--fg-muted)" />}
            {job.destination && <span>{job.destination}</span>}
            {!job.origin && !job.destination && '—'}
          </span>
        </td>
        <td>{mode}</td>
        <td>{job.etd || '—'}</td>
        <td>{job.eta || '—'}</td>
        <td className="cell-number">{formatCurrency(job.revenue)}</td>
        <td className={`cell-number ${job.cost < 0 ? 'cell-number--negative' : ''}`}>
          {formatCurrency(job.cost)}
        </td>
        <td className="cell-number">{formatCurrency((job as any).wip || 0)}</td>
        <td className="cell-number">{formatCurrency(job.accrual)}</td>
        <td className={`cell-number ${job.job_profit < 0 ? 'cell-number--negative' : job.job_profit > 0 ? 'cell-number--positive' : ''}`}>
          {formatCurrency(job.job_profit)}
        </td>
        <td className={`cell-number ${((job as any).margin_pct || 0) < 0 ? 'cell-number--negative' : ''}`}>
          {((job as any).margin_pct || 0).toFixed(2)}%
        </td>
        <td style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 6,
              fontSize: '0.7rem', fontWeight: 700,
              background: statusConf.bg, color: statusConf.colour,
            }}>
              {statusConf.label}
            </span>
            {isOverdue && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                padding: '2px 6px', borderRadius: 5,
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.03em',
                background: 'rgba(239,68,68,0.12)', color: '#dc2626',
              }}>
                <AlertCircle size={9} /> OVERDUE
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Comment Panel */}
      {isExpanded && (
        <tr>
          <td colSpan={colSpan} style={{ padding: 0 }}>
            <div style={{
              padding: '1.25rem 1.5rem', background: 'var(--bg-subtle)',
              borderTop: '1px solid var(--border-base)',
              borderBottom: '2px solid var(--border-base)',
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'start' }}>
                {/* Auto-Resolved Banner */}
                {isClosed && (
                  <div style={{
                    gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 1rem', borderRadius: 8,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    fontSize: '0.78rem', fontWeight: 600, color: '#16a34a',
                  }}>
                    <AlertCircle size={14} />
                    This job was auto-resolved{job.category ? ` — ${job.category}` : ''}. Fields are read-only.
                  </div>
                )}
                {/* P&L Reason */}
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    P&L REASON
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={isClosed}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                      border: '1px solid var(--border-base)', background: isClosed ? 'var(--bg-subtle)' : 'var(--bg-base)',
                      fontSize: '0.8rem', color: 'var(--fg-base)',
                      opacity: isClosed ? 0.7 : 1,
                    }}
                  >
                    <option value="">Select reason...</option>
                    {plCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Comment */}
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    OPERATOR COMMENT
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Explain the variance..."
                    rows={2}
                    disabled={isClosed}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                      border: '1px solid var(--border-base)', background: isClosed ? 'var(--bg-subtle)' : 'var(--bg-base)',
                      fontSize: '0.8rem', color: 'var(--fg-base)', resize: 'vertical',
                      fontFamily: 'inherit', opacity: isClosed ? 0.7 : 1,
                    }}
                  />
                </div>

                {/* HO Notes */}
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    FINANCE NOTES
                  </label>
                  <textarea
                    value={notesHo}
                    onChange={e => setNotesHo(e.target.value)}
                    placeholder="Finance commentary..."
                    rows={2}
                    disabled={isClosed}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                      border: '1px solid var(--border-base)', background: isClosed ? 'var(--bg-subtle)' : 'var(--bg-base)',
                      fontSize: '0.8rem', color: 'var(--fg-base)', resize: 'vertical',
                      fontFamily: 'inherit', opacity: isClosed ? 0.7 : 1,
                    }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem', visibility: 'hidden' }}>
                    ACTIONS
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={isClosed}
                    style={{
                      padding: '0.45rem 0.6rem', borderRadius: 8,
                      border: '1px solid var(--border-base)', background: isClosed ? 'var(--bg-subtle)' : 'var(--bg-base)',
                      fontSize: '0.75rem', color: 'var(--fg-base)', fontWeight: 600,
                      opacity: isClosed ? 0.7 : 1,
                    }}
                  >
                    {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                      <option key={val} value={val}>{conf.label}</option>
                    ))}
                  </select>
                  {!isClosed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      padding: '0.5rem 1rem', borderRadius: 8,
                      background: saving ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 700,
                      cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                    }}
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  )}
                </div>
              </div>

              {/* Last Updated */}
              {job.updated_at && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={10} />
                  Last updated: {new Date(job.updated_at).toLocaleString()}
                  {job.assigned_to && <> · Assigned to: <strong>{job.assigned_to}</strong></>}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
