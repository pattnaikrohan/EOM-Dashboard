/**
 * OperatorView — Individual operator's dashboard with flag-grouped sections.
 * All 13 checkers are always visible, grouped under PENDING INVOICING
 * and MONTH END CLOSING CHECKS, even when a section has 0 jobs.
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, User, CheckCircle2, ArrowUpRight, ArrowDownLeft, Repeat, MapPin, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getOperatorDetail } from '../services/api';
import type { OperatorDetail, Job } from '../services/api';
import KPICards from '../components/KPICards';
import JobTable from '../components/JobTable';
import PremiumLoader from '../components/PremiumLoader';
import { FLAG_COLOURS, FLAG_DESCRIPTIONS } from '../utils/constants';

// ── Section groups ────────────────────────────────────────────────────────────
const PENDING_INVOICING_FLAGS = [
  'EXPORTS Jobs pending invoicing',
  'IMPORTS Jobs pending invoicing',
  'CROSS-TRADE Jobs pending invoicing',
  'DOMESTIC Jobs pending invoicing',
];

// Only operator-visible month-end flags (others are Ops Manager only)
const MONTH_END_CLOSING_FLAGS = [
  'Jobs with WIPs',
  'Jobs at INV Status',
  'Jobs with Aged Accruals',
];

// All 13 checkers in order
const ALL_CHECKERS = [...PENDING_INVOICING_FLAGS, ...MONTH_END_CLOSING_FLAGS];

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0' });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const diff = lastDay.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ d: '0', h: '0', m: '0' });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      
      setTimeLeft({ d: String(days), h: String(hours), m: String(minutes) });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderUnit = (val: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{val}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{label}</span>
    </div>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      background: '#ffffff', padding: '0.6rem 1.25rem', borderRadius: '9999px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={16} color="#3b82f6" strokeWidth={2.5} />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Month End</span>
      </div>
      <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {renderUnit(timeLeft.d, 'd')}
        {renderUnit(timeLeft.h, 'h')}
        {renderUnit(timeLeft.m, 'm')}
      </div>
    </div>
  );
}

export default function OperatorView() {
  const { globalFlags, globalBranches, globalDepartments, operators, loaded } = useData();
  const [searchParams] = useSearchParams();
  const initialOp = searchParams.get('operator') || 'ALL';
  const [selectedCode, setSelectedCode] = useState<string>(initialOp);
  const [data, setData] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingInvTab, setPendingInvTab] = useState<string>('EXPORTS Jobs pending invoicing');

  useEffect(() => {
    if (!loaded) return;
    setLoading(true);
    getOperatorDetail(selectedCode, globalFlags, globalBranches, globalDepartments)
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
  }, [selectedCode, globalFlags, globalBranches, globalDepartments, loaded]);


  if (!loaded) {
    return (
      <div className="empty-state fade-in">
        <h2 className="empty-state__title">No Data Loaded</h2>
        <p className="empty-state__text">Sync or upload data from the Dashboard first.</p>
      </div>
    );
  }

  if (loading) {
    return <PremiumLoader text="Loading operator data..." />;
  }

  if (!data) {
    return (
      <div className="empty-state fade-in">
        <h2 className="empty-state__title">Data Not Found</h2>
        <p className="empty-state__text">No data available for operator "{selectedCode}"</p>
      </div>
    );
  }

  const toggleSection = (flag: string) => {
    setExpanded(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  // Determine default sort based on flag type
  const getDefaultSort = (flag: string): { key: string; dir: 'asc' | 'desc' } | undefined => {
    if (flag.includes('EXPORTS') || flag.includes('DOMESTIC') || flag.includes('CROSS-TRADE')) {
      return { key: 'etd', dir: 'asc' };
    }
    if (flag.includes('IMPORTS')) {
      return { key: 'eta', dir: 'asc' };
    }
    return undefined;
  };

  const renderFlagSection = (flag: string) => {
    const jobs: Job[] = data.jobs_by_flag[flag] || [];
    const flagInfo = FLAG_COLOURS[flag];
    const isOpen = expanded[flag] ?? false;
    const isEmpty = jobs.length === 0;
    const flagDefaultSort = getDefaultSort(flag);
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span className="card__title">{flag}</span>
              {FLAG_DESCRIPTIONS[flag] && (
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--fg-muted)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  opacity: 0.8,
                }}>
                  {FLAG_DESCRIPTIONS[flag]}
                </span>
              )}
            </div>
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
                <DirectionTabView jobs={jobs} defaultSort={flagDefaultSort} flag={flag} />
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-header__overline">Shipment Dashboard</div>
          <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 16px rgba(99,102,241,0.25), inset 0 2px 4px rgba(255,255,255,0.2)',
            }}>
              <User size={24} strokeWidth={2.5} />
            </div>
            {selectedCode === 'ALL' ? 'All Operators' : `${selectedCode}'s Workflow`}
          </h1>
          <p className="page-header__subtitle">
            {data.branch} · {data.period}
          </p>
        </div>
        <CountdownTimer />
      </div>

      {/* Operator Filter Tabs */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
          Filter by Operator
        </div>
        <div className="operator-pills" style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem', paddingBottom: '0.75rem'
        }}>
          <button 
            className={`operator-pill ${selectedCode === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCode('ALL')}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            All Operators 
            <span className="operator-pill-badge">{operators.reduce((sum, op) => sum + (op.visible_jobs || op.total_jobs), 0)}</span>
          </button>
          {[...operators].sort((a, b) => a.code.localeCompare(b.code)).map(op => (
            <button
              key={op.code}
              className={`operator-pill ${selectedCode === op.code ? 'active' : ''}`}
              onClick={() => setSelectedCode(op.code)}
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                {op.code}
              </span>
              <span className="operator-pill-badge">{op.visible_jobs !== undefined ? op.visible_jobs : op.total_jobs}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards kpi={data.kpi} />



      {/* ── SECTION 1: GENERAL PENDING INVOICING ── */}
      <div style={{
        margin: '1.5rem 0 0.75rem',
        padding: '0.5rem 0',
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--fg-base)', marginBottom: '0.25rem' }}>
          PENDING INVOICING
        </div>
        <div style={{
          fontSize: '0.85rem', fontWeight: 500,
          color: 'var(--fg-muted)'
        }}>
          Jobs due for invoicing this month
        </div>
      </div>

      <div className="section-card" style={{
        background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${FLAG_COLOURS[pendingInvTab]?.hex || '#3b82f6'}`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        overflow: 'hidden', marginBottom: '2rem', transition: 'border-left-color 0.3s ease'
      }}>
        {/* Tab Header */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: '#f8fafc', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid #e2e8f0' }}>
          {PENDING_INVOICING_FLAGS.map(flag => {
            const isActive = pendingInvTab === flag;
            const count = (data.jobs_by_flag[flag] || []).length;
            const flagInfo = FLAG_COLOURS[flag] || { hex: '#3b82f6' };
            
            let tabName = flag.replace(' Jobs pending invoicing', '');
            let Icon = ArrowUpRight;
            if (tabName === 'IMPORTS') { tabName = 'Import'; Icon = ArrowDownLeft; }
            if (tabName === 'EXPORTS') { tabName = 'Export'; Icon = ArrowUpRight; }
            if (tabName === 'CROSS-TRADE') { tabName = 'Cross-Trade'; Icon = Repeat; }
            if (tabName === 'DOMESTIC') { tabName = 'Domestic'; Icon = MapPin; }

            return (
              <button
                key={flag}
                onClick={() => setPendingInvTab(flag)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 1rem',
                  background: isActive ? '#fff' : 'transparent',
                  border: isActive ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#0f172a' : '#64748b',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)' : 'none'
                }}
              >
                <Icon size={14} color={isActive ? flagInfo.hex : '#94a3b8'} strokeWidth={3} />
                <span style={{ paddingTop: '1px' }}>{tabName} ({count})</span>
              </button>
            );
          })}
        </div>
        
        {/* Tab Content */}
        <div style={{ padding: '0', background: '#fff' }}>
          <JobTable 
            jobs={data.jobs_by_flag[pendingInvTab] || []}
            defaultSort={getDefaultSort(pendingInvTab)}
            hideRevenueProfit
          />
        </div>
      </div>

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
function DirectionTabView({ jobs, defaultSort, flag }: {
  jobs: Job[];
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  flag: string;
}) {
  const exportJobs = jobs.filter(j => j.direction === 'export' || (!j.direction && j.is_export));
  const importJobs = jobs.filter(j => j.direction === 'import' || (!j.direction && !j.is_export && j.direction !== 'domestic' && j.direction !== 'crosstrade'));
  const domesticJobs = jobs.filter(j => j.direction === 'domestic');
  const crossTradeJobs = jobs.filter(j => j.direction === 'crosstrade');

  // Only show tabs that have jobs, or show Export/Import if both are 0 (as a fallback so there's at least one tab)
  const hasExport = exportJobs.length > 0;
  const hasImport = importJobs.length > 0;
  const hasDomestic = domesticJobs.length > 0;
  const hasCross = crossTradeJobs.length > 0;

  // Determine which tabs to show. If it's a direction-specific flag, only show that tab.
  // Otherwise, show all tabs that have jobs, plus keep Export/Import visible if we want a default.
  // Actually, to keep it clean: only show tabs that have > 0 jobs, but ensure at least one tab is active.
  const availableTabs = [
    ...(hasExport ? ['export'] : []),
    ...(hasImport ? ['import'] : []),
    ...(hasDomestic ? ['domestic'] : []),
    ...(hasCross ? ['crosstrade'] : [])
  ];

  // If no tabs have jobs (shouldn't happen since jobs.length > 0), fallback to export
  if (availableTabs.length === 0) availableTabs.push('export');

  // If there's only one direction present, we don't necessarily need tabs, 
  // but to match the design request, we will show it if it's not a direction-specific flag.
  // Actually, let's always show tabs if there's more than one, or if it's a generic flag.
  // We'll just show the available tabs.
  const [tab, setTab] = useState<string>(availableTabs[0]);

  // Handle cases where jobs change and current tab has 0 jobs
  useEffect(() => {
    if (!availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
  }, [availableTabs, tab]);

  // Sort based on tab
  const getSort = () => {
    if (defaultSort) return defaultSort;
    if (tab === 'import') return { key: 'eta', dir: 'asc' as const };
    return { key: 'etd', dir: 'asc' as const }; // export, domestic, crosstrade
  };

  const currentJobs = tab === 'export' ? exportJobs 
                    : tab === 'import' ? importJobs 
                    : tab === 'domestic' ? domesticJobs 
                    : crossTradeJobs;

  // If there is only one direction and it perfectly matches the flag name (e.g. EXPORTS Jobs pending invoicing),
  // it might be cleaner to omit the tab. But let's show it anyway for consistency, or just hide if availableTabs.length === 1
  const hideTabs = availableTabs.length === 1 && flag.toUpperCase().includes(availableTabs[0].toUpperCase());

  return (
    <>
      {!hideTabs && (
        <div className="direction-tabs" style={{ marginBottom: '1rem' }}>
          {hasExport && (
            <button
              className={`direction-tab ${tab === 'export' ? 'active' : ''}`}
              onClick={() => setTab('export')}
            >
              <span style={{ color: '#3b82f6' }}>↗</span> Export ({exportJobs.length})
            </button>
          )}
          {hasImport && (
            <button
              className={`direction-tab ${tab === 'import' ? 'active' : ''}`}
              onClick={() => setTab('import')}
            >
              <span style={{ color: '#f59e0b' }}>↙</span> Import ({importJobs.length})
            </button>
          )}
          {hasDomestic && (
            <button
              className={`direction-tab ${tab === 'domestic' ? 'active' : ''}`}
              onClick={() => setTab('domestic')}
            >
              <span style={{ color: '#10b981' }}>⟷</span> Domestic ({domesticJobs.length})
            </button>
          )}
          {hasCross && (
            <button
              className={`direction-tab ${tab === 'crosstrade' ? 'active' : ''}`}
              onClick={() => setTab('crosstrade')}
            >
              <span style={{ color: '#8b5cf6' }}>⇄</span> Cross-trade ({crossTradeJobs.length})
            </button>
          )}
        </div>
      )}
      <JobTable
        jobs={currentJobs}
        compact
        hideRevenueProfit
        defaultSort={getSort()}
      />
    </>
  );
}
