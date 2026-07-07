/**
 * OperatorView — Individual operator's dashboard with flag-grouped sections.
 * All 13 checkers are always visible, grouped under PENDING INVOICING
 * and MONTH END CLOSING CHECKS, even when a section has 0 jobs.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, User, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getOperatorDetail } from '../services/api';
import type { OperatorDetail, Job } from '../services/api';
import KPICards from '../components/KPICards';
import JobTable from '../components/JobTable';
import { FLAG_COLOURS } from '../utils/constants';

// ── Section groups ────────────────────────────────────────────────────────────
const PENDING_INVOICING_FLAGS = [
  'EXPORTS Jobs pending invoicing',
  'CROSS-TRADE Jobs pending invoicing',
  'IMPORTS B Jobs pending invoicing',
  'IMPORTS S Jobs pending invoicing',
];

const MONTH_END_CLOSING_FLAGS = [
  'Unbilled Jobs with PROFIT',
  'Unbilled Jobs with LOSS',
  'Jobs with WIPs',
  'Billed Jobs with LOSS',
  'Billed Jobs with LOW MARGIN',
  'Billed Jobs — EXTREME Profit',
  'Jobs at INV Status',
  'Jobs at CMP — Ready to CLOSE',
  'Jobs with Aged Accruals',
];

// All 13 checkers in order
const ALL_CHECKERS = [...PENDING_INVOICING_FLAGS, ...MONTH_END_CLOSING_FLAGS];

export default function OperatorView() {
  const { code } = useParams<{ code: string }>();
  const { globalFlags } = useData();
  const [data, setData] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    getOperatorDetail(code, globalFlags)
      .then(d => {
        setData(d);
        // Auto-expand sections that have jobs
        const exp: Record<string, boolean> = {};
        ALL_CHECKERS.forEach(f => {
          const jobs = d.jobs_by_flag[f] || [];
          exp[f] = jobs.length > 0;
        });
        setExpanded(exp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code, globalFlags]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '2rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: '1rem', borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state fade-in">
        <h2 className="empty-state__title">Operator Not Found</h2>
        <p className="empty-state__text">No data available for operator "{code}"</p>
      </div>
    );
  }

  const toggleSection = (flag: string) => {
    setExpanded(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  const renderFlagSection = (flag: string) => {
    const jobs: Job[] = data.jobs_by_flag[flag] || [];
    const flagInfo = FLAG_COLOURS[flag];
    const isOpen = expanded[flag] ?? false;
    const isEmpty = jobs.length === 0;

    const exportJobs = jobs.filter(j => j.is_export);
    const importJobs = jobs.filter(j => !j.is_export);

    return (
      <div
        key={flag}
        className="card"
        style={{
          borderLeftColor: flagInfo?.hex,
          borderLeftWidth: 3,
          opacity: isEmpty ? 0.75 : 1,
        }}
      >
        <div className="card__header" onClick={() => toggleSection(flag)}>
          <div className="card__header-left">
            <div
              className="card__header-icon"
              style={{
                background: flagInfo?.bg || 'var(--bg-subtle)',
                borderColor: flagInfo?.border || 'transparent',
                color: flagInfo?.text || 'var(--fg-muted)',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: 3,
                background: flagInfo?.hex || '#ccc',
              }} />
            </div>
            <span className="card__title">{flag}</span>
            <span
              className="card__count"
              style={{
                background: isEmpty ? 'rgba(34,197,94,0.1)' : (flagInfo?.bg || 'var(--bg-subtle)'),
                color: isEmpty ? '#16a34a' : (flagInfo?.text || 'var(--fg-muted)'),
              }}
            >
              {isEmpty ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={12} /> 0 jobs
                </span>
              ) : (
                `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`
              )}
            </span>
          </div>
          <ChevronRight
            size={16}
            className={`card__chevron ${isOpen ? 'card__chevron--open' : ''}`}
          />
        </div>

        {isOpen && (
          <div className="fade-in">
            {isEmpty ? (
              <div style={{
                textAlign: 'center', padding: '1.25rem', color: '#16a34a',
                fontSize: '0.85rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem',
              }}>
                <CheckCircle2 size={16} />
                No pending jobs — All clear
              </div>
            ) : (
              <>
                {exportJobs.length > 0 && importJobs.length > 0 ? (
                  <DirectionTabView exportJobs={exportJobs} importJobs={importJobs} />
                ) : (
                  <JobTable jobs={jobs} compact hideRevenueProfit />
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__overline">Operator Review</div>
        <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            <User size={22} />
          </div>
          EOM Review — {code}
        </h1>
        <p className="page-header__subtitle">
          {data.branch} · {data.period}
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards kpi={data.kpi} />

      {/* ── SECTION 1: PENDING INVOICING ── */}
      <div style={{
        margin: '1.5rem 0 0.75rem',
        padding: '0.5rem 0',
        borderBottom: '2px solid #e2e8f0',
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
          color: '#3b82f6', textTransform: 'uppercase' as const,
        }}>
          Section 1
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg-base)' }}>
          Pending Invoicing — {PENDING_INVOICING_FLAGS.length} Checkers
        </div>
      </div>

      {PENDING_INVOICING_FLAGS.map(flag => renderFlagSection(flag))}

      {/* ── SECTION 2: MONTH END CLOSING CHECKS ── */}
      <div style={{
        margin: '2rem 0 0.75rem',
        padding: '0.5rem 0',
        borderBottom: '2px solid #e2e8f0',
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
          color: '#f59e0b', textTransform: 'uppercase' as const,
        }}>
          Section 2
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg-base)' }}>
          Month End Closing Checks — {MONTH_END_CLOSING_FLAGS.length} Checkers
        </div>
      </div>

      {MONTH_END_CLOSING_FLAGS.map(flag => renderFlagSection(flag))}
    </div>
  );
}

/** Direction tabs sub-component */
function DirectionTabView({ exportJobs, importJobs }: { exportJobs: Job[]; importJobs: Job[] }) {
  const [tab, setTab] = useState<'export' | 'import'>('export');

  return (
    <>
      <div className="direction-tabs">
        <button
          className={`direction-tab ${tab === 'export' ? 'active' : ''}`}
          onClick={() => setTab('export')}
        >
          <span style={{ color: '#3b82f6' }}>↗</span> Export ({exportJobs.length})
        </button>
        <button
          className={`direction-tab ${tab === 'import' ? 'active' : ''}`}
          onClick={() => setTab('import')}
        >
          <span style={{ color: '#f59e0b' }}>↙</span> Import ({importJobs.length})
        </button>
      </div>
      <JobTable jobs={tab === 'export' ? exportJobs : importJobs} compact hideRevenueProfit />
    </>
  );
}
