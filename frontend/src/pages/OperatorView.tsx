/**
 * OperatorView — Individual operator's dashboard with flag-grouped sections.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getOperatorDetail } from '../services/api';
import type { OperatorDetail, Job } from '../services/api';
import KPICards from '../components/KPICards';
import JobTable from '../components/JobTable';
import { FLAG_COLOURS, FLAG_PRIORITY } from '../utils/constants';

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
        // Auto-expand non-clean sections
        const exp: Record<string, boolean> = {};
        Object.keys(d.jobs_by_flag).forEach(f => {
          exp[f] = f !== 'CLEAN';
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

  // Order sections by FLAG_PRIORITY
  const orderedFlags = FLAG_PRIORITY.filter(f => data.jobs_by_flag[f]?.length > 0);

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

      {/* Flag Sections */}
      {orderedFlags.map(flag => {
        const jobs: Job[] = data.jobs_by_flag[flag] || [];
        const flagInfo = FLAG_COLOURS[flag];
        const isOpen = expanded[flag] ?? false;

        const exportJobs = jobs.filter(j => j.is_export);
        const importJobs = jobs.filter(j => !j.is_export);

        return (
          <div key={flag} className="card" style={{ borderLeftColor: flagInfo?.hex, borderLeftWidth: 3 }}>
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
                    background: flagInfo?.bg || 'var(--bg-subtle)',
                    color: flagInfo?.text || 'var(--fg-muted)',
                  }}
                >
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              </div>
              <ChevronRight
                size={16}
                className={`card__chevron ${isOpen ? 'card__chevron--open' : ''}`}
              />
            </div>

            {isOpen && (
              <div className="fade-in">
                {/* Direction tabs */}
                {exportJobs.length > 0 && importJobs.length > 0 ? (
                  <DirectionTabView exportJobs={exportJobs} importJobs={importJobs} />
                ) : (
                  <JobTable jobs={jobs} compact hideRevenueProfit />
                )}
              </div>
            )}
          </div>
        );
      })}

      {orderedFlags.length === 0 && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <p style={{ fontStyle: 'italic' }}>No flagged jobs for this operator this period</p>
          </div>
        </div>
      )}
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
