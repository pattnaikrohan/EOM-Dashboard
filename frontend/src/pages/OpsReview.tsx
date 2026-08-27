/**
 * OpsReview — Ops Manager Review page.
 * Uses the ops-review API so jobs appear under EVERY flag they qualify for.
 * Shows Revenue & Margin% (ops manager can see everything).
 * Includes: KPI cards, tabbed pending invoicing, all 13 checkers,
 * direction sub-tabs, scroll-to-top, countdown timer, jump-to-section.
 *
 * Section order is custom for Ops Manager (different from Operator View):
 *   Month End Closing Checks first, then Pending Invoicing.
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownLeft, Repeat, MapPin, Clock, ArrowUp, Search,
} from 'lucide-react';
import { useData } from '../context/DataContext';

import { getOpsReview } from '../services/api';
import type { Job, KPI } from '../services/api';
import KPICards from '../components/KPICards';
import JobTable from '../components/JobTable';
import PremiumLoader from '../components/PremiumLoader';
import { FLAG_COLOURS, FLAG_DESCRIPTIONS } from '../utils/constants';



// ── Ops Manager section order (Month End first, then Pending Invoicing) ───────
const OPS_MONTH_END_FLAGS = [
  'Unbilled Jobs with LOSS',
  'Unbilled Jobs with PROFIT',
  'Jobs with WIPs',
  'Billed Jobs with LOSS',
  'Billed Jobs with LOW MARGIN',
  'Billed Jobs — EXTREME Profit',
  'Jobs at INV Status',
  'Jobs at CMP — Ready to CLOSE',
  'Jobs with Aged Accruals',
];

const OPS_PENDING_INVOICING_FLAGS = [
  'EXPORTS Jobs pending invoicing',
  'IMPORTS Jobs pending invoicing',
  'CROSS-TRADE Jobs pending invoicing',
  'DOMESTIC Jobs pending invoicing',
];

const OPS_ALL_FLAGS = [...OPS_MONTH_END_FLAGS, ...OPS_PENDING_INVOICING_FLAGS];

const SHORT_NAMES: Record<string, string> = {
  'EXPORTS Jobs pending invoicing': 'EXPORTS',
  'IMPORTS Jobs pending invoicing': 'IMPORTS',
  'CROSS-TRADE Jobs pending invoicing': 'CROSS-TRADE',
  'DOMESTIC Jobs pending invoicing': 'DOMESTIC',
  'Unbilled Jobs with PROFIT': 'UNBILLED PROFIT',
  'Unbilled Jobs with LOSS': 'UNBILLED LOSS',
  'Jobs with WIPs': 'WIPs > 40',
  'Billed Jobs with LOSS': 'BILLED LOSS',
  'Billed Jobs with LOW MARGIN': 'LOW MARGIN',
  'Billed Jobs — EXTREME Profit': 'EXTREME PROFIT',
  'Jobs at INV Status': 'INV STATUS',
  'Jobs at CMP — Ready to CLOSE': 'CMP READY',
  'Jobs with Aged Accruals': 'AGED ACCRUALS',
};

// ── Countdown Timer ──────────────────────────────────────────────────────────
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
        <Clock size={16} color="#f59e0b" strokeWidth={2.5} />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Month End</span>
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

// ── Scroll-to-Top Button ──────────────────────────────────────────────────────
function ScrollToTop() {
  const handleClick = () => {
    const scrollContainer = document.querySelector('.content');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return createPortal(
    <button
      className="scroll-to-top visible"
      onClick={handleClick}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp size={18} strokeWidth={2.5} />
    </button>,
    document.body
  );
}

// ── Direction Tab Sub-View ────────────────────────────────────────────────────
function DirectionTabView({ jobs, defaultSort, flag }: {
  jobs: Job[];
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  flag: string;
}) {
  const exportJobs = jobs.filter(j => j.direction === 'export' || (!j.direction && j.is_export));
  const importJobs = jobs.filter(j => j.direction === 'import' || (!j.direction && !j.is_export && j.direction !== 'domestic' && j.direction !== 'crosstrade'));
  const domesticJobs = jobs.filter(j => j.direction === 'domestic');
  const crossTradeJobs = jobs.filter(j => j.direction === 'crosstrade');

  const hasExport = exportJobs.length > 0;
  const hasImport = importJobs.length > 0;
  const hasDomestic = domesticJobs.length > 0;
  const hasCross = crossTradeJobs.length > 0;

  const availableTabs = [
    ...(hasExport ? ['export'] : []),
    ...(hasImport ? ['import'] : []),
    ...(hasDomestic ? ['domestic'] : []),
    ...(hasCross ? ['crosstrade'] : []),
  ];
  if (availableTabs.length === 0) availableTabs.push('export');

  const [tab, setTab] = useState<string>(availableTabs[0]);

  useEffect(() => {
    if (!availableTabs.includes(tab)) setTab(availableTabs[0]);
  }, [availableTabs, tab]);

  const getSort = () => {
    if (defaultSort) return defaultSort;
    if (tab === 'import') return { key: 'eta', dir: 'asc' as const };
    return { key: 'etd', dir: 'asc' as const };
  };

  const currentJobs = tab === 'export' ? exportJobs
    : tab === 'import' ? importJobs
    : tab === 'domestic' ? domesticJobs
    : crossTradeJobs;

  const hideTabs = availableTabs.length === 1 && flag.toUpperCase().includes(availableTabs[0].toUpperCase());

  return (
    <>
      {!hideTabs && (
        <div className="direction-tabs" style={{ marginBottom: '1rem' }}>
          {hasExport && (
            <button className={`direction-tab ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>
              <span style={{ color: '#3b82f6' }}>↗</span> Export ({exportJobs.length})
            </button>
          )}
          {hasImport && (
            <button className={`direction-tab ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>
              <span style={{ color: '#f59e0b' }}>↙</span> Import ({importJobs.length})
            </button>
          )}
          {hasDomestic && (
            <button className={`direction-tab ${tab === 'domestic' ? 'active' : ''}`} onClick={() => setTab('domestic')}>
              <span style={{ color: '#10b981' }}>⟷</span> Domestic ({domesticJobs.length})
            </button>
          )}
          {hasCross && (
            <button className={`direction-tab ${tab === 'crosstrade' ? 'active' : ''}`} onClick={() => setTab('crosstrade')}>
              <span style={{ color: '#8b5cf6' }}>⇄</span> Cross-trade ({crossTradeJobs.length})
            </button>
          )}
        </div>
      )}
      <JobTable jobs={currentJobs} compact defaultSort={getSort()} />
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OpsReview() {
  const { globalFlags, globalBranches, globalDepartments, dashboard, loaded, getTabCache, setTabCache } = useData();
  const isSearchPermitted = true;
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');

  const [sections, setSections] = useState<Record<string, Job[]>>({});
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingInvTab, setPendingInvTab] = useState<string>('EXPORTS Jobs pending invoicing');

  const filterJobsByNumber = (jobList: Job[]) => {
    if (!jobSearchQuery || !jobSearchQuery.trim()) return jobList;
    const q = jobSearchQuery.toLowerCase().trim();
    return jobList.filter(j => (j.job_number || '').toLowerCase().includes(q));
  };

  const loadData = useCallback(async () => {
    if (!loaded) return;
    const cacheKey = `${(globalFlags || []).join(',')}_${(globalBranches || []).join(',')}_${(globalDepartments || []).join(',')}`;
    const cached = getTabCache('opsReview', cacheKey);
    if (cached) {
      setSections(cached.sections);
      setKpi(cached.kpi);
      setTotal(cached.total);
      setExpanded(cached.expanded);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const opsData = await getOpsReview(globalFlags, globalBranches, globalDepartments);

      const fullSections: Record<string, Job[]> = {};
      OPS_ALL_FLAGS.forEach(f => { fullSections[f] = []; });
      Object.keys(opsData.sections).forEach(s => {
        fullSections[s] = opsData.sections[s];
      });

      setSections(fullSections);
      setKpi(opsData.kpi);

      const totalCount = Object.values(fullSections).reduce((sum, jobs) => sum + jobs.length, 0);
      setTotal(totalCount);

      const autoExpanded: Record<string, boolean> = {};
      Object.keys(fullSections).forEach(f => {
        autoExpanded[f] = fullSections[f].length > 0;
      });
      setExpanded(autoExpanded);

      setTabCache('opsReview', cacheKey, {
        sections: fullSections,
        kpi: opsData.kpi,
        total: totalCount,
        expanded: autoExpanded,
      });
    } catch (err) {
      console.error('Failed to load ops review:', err);
    } finally {
      setLoading(false);
    }
  }, [globalFlags, globalBranches, globalDepartments, loaded, getTabCache, setTabCache]);


  useEffect(() => { loadData(); }, [loadData]);

  if (!loaded) {
    return (
      <div className="empty-state fade-in">
        <h2 className="empty-state__title">No Data Loaded</h2>
        <p className="empty-state__text">Sync or upload data from the Dashboard first.</p>
      </div>
    );
  }

  if (loading) {
    return <PremiumLoader text="Loading Ops Manager data..." total={dashboard?.kpi?.total_jobs} />;
  }

  const toggleSection = (flag: string) => {
    setExpanded(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

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
    const rawJobs: Job[] = sections[flag] || [];
    const jobs = filterJobsByNumber(rawJobs);
    const flagInfo = FLAG_COLOURS[flag];
    const isOpen = jobSearchQuery.trim() ? jobs.length > 0 : (expanded[flag] ?? false);
    const isEmpty = jobs.length === 0;
    const flagDefaultSort = getDefaultSort(flag);

    return (
      <div
        key={flag}
        id={`section-${flag.replace(/\s+/g, '-')}`}
        className="card"
        style={{
          borderLeftColor: flagInfo?.hex,
          borderLeftWidth: 3,
          opacity: isEmpty ? 0.75 : 1,
          scrollMarginTop: '2rem',
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
              <DirectionTabView jobs={jobs} defaultSort={flagDefaultSort} flag={flag} />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* Scroll-to-Top Button */}
      <ScrollToTop />

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-header__overline">Operations Review</div>
          <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 16px rgba(245,158,11,0.25), inset 0 2px 4px rgba(255,255,255,0.2)',
            }}>
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            Ops Manager Review
          </h1>
          <p className="page-header__subtitle">
            {total} jobs flagged for management review
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
          <CountdownTimer />
          {isSearchPermitted && (
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#d97706' }} />
              <input 
                type="text" 
                placeholder="Search Job Number..." 
                value={jobSearchQuery}
                onChange={e => setJobSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 2rem 0.4rem 2.2rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '20px',
                  border: '1.5px solid rgba(245,158,11,0.35)',
                  outline: 'none',
                  background: '#ffffff',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.12)'
                }}
              />
              {jobSearchQuery && (
                <button 
                  onClick={() => setJobSearchQuery('')}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: '#ef4444', color: '#fff', borderRadius: '50%',
                    width: '16px', height: '16px', fontSize: '11px', fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {kpi && <KPICards kpi={kpi} />}

      {/* Jump to Section */}
      <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
          Jump to Section
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingBottom: '0.75rem' }}>
          {OPS_ALL_FLAGS.map(name => {
            const count = filterJobsByNumber(sections[name] || []).length;
            const colour = FLAG_COLOURS[name]?.hex || '#6366f1';
            const shortName = SHORT_NAMES[name] || name.replace('Jobs pending invoicing', '').replace('Jobs', '').trim();

            return (
              <button
                key={`jump-${name}`}
                className="jump-pill"
                onClick={() => {
                  // For pending invoicing flags, switch to that tab and scroll to the section card
                  if (OPS_PENDING_INVOICING_FLAGS.includes(name)) {
                    setPendingInvTab(name);
                    const el = document.getElementById('pending-invoicing-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    const el = document.getElementById(`section-${name.replace(/\s+/g, '-')}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      if (!expanded[name]) {
                        setExpanded(prev => ({ ...prev, [name]: true }));
                      }
                    }
                  }
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colour, marginRight: '6px', flexShrink: 0 }} />
                {shortName}
                <span className="jump-pill-badge" style={{ marginLeft: '6px' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 1: MONTH END CLOSING CHECKS ── */}
      <div style={{
        margin: '1rem 0 0.75rem',
        padding: '0.5rem 0',
        borderBottom: '2px solid #e2e8f0',
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
          color: '#f59e0b', textTransform: 'uppercase' as const,
        }}>
          Section 1
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg-base)' }}>
          Month End Closing Checks — {OPS_MONTH_END_FLAGS.length} Checkers
        </div>
      </div>

      {OPS_MONTH_END_FLAGS.map(flag => renderFlagSection(flag))}

      {/* ── SECTION 2: PENDING INVOICING ── */}
      <div id="pending-invoicing-section" style={{
        margin: '2rem 0 0.75rem',
        padding: '0.5rem 0',
        scrollMarginTop: '2rem',
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
          color: '#3b82f6', textTransform: 'uppercase' as const,
        }}>
          Section 2
        </div>
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
        overflow: 'hidden', marginBottom: '2rem', transition: 'border-left-color 0.3s ease',
        scrollMarginTop: '2rem',
      }}>
        {/* Tab Header */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: '#f8fafc', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid #e2e8f0' }}>
          {OPS_PENDING_INVOICING_FLAGS.map(flag => {
            const isActive = pendingInvTab === flag;
            const count = filterJobsByNumber(sections[flag] || []).length;
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
            jobs={filterJobsByNumber(sections[pendingInvTab] || [])}
            defaultSort={getDefaultSort(pendingInvTab)}
          />
        </div>
      </div>
    </div>
  );
}
