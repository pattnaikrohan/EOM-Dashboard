/**
 * OpsReview — Cross-operator Ops Manager review page.
 */
import { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getOpsReview } from '../services/api';
import type { Job } from '../services/api';
import JobTable from '../components/JobTable';
import { FLAG_PRIORITY, FLAG_COLOURS, FLAG_DESCRIPTIONS } from '../utils/constants';

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

export default function OpsReview() {
  const [sections, setSections] = useState<Record<string, Job[]>>({});
  const [total, setTotal] = useState(0);
  const [branch, setBranch] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    getOpsReview()
      .then(data => {
        const fullSections: Record<string, Job[]> = {};
        
        // Define all possible ops sections to ensure they are always visible
        const allPossibleSections = FLAG_PRIORITY.filter(f => f !== 'CLEAN');

        allPossibleSections.forEach(s => { fullSections[s] = []; });
        Object.keys(data.sections).forEach(s => { fullSections[s] = data.sections[s]; });

        setSections(fullSections);
        setTotal(data.total);
        setBranch(data.branch);
        setPeriod(data.period);
        const exp: Record<string, boolean> = {};
        Object.keys(fullSections).forEach(s => { exp[s] = true; });
        setExpanded(exp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '2rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: '1rem', borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  const sectionNames = Object.keys(sections);

  const sectionColours: Record<string, string> = {
    // Fall back to flag colors
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header__overline">Operations Review</div>
        <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
          }}>
            <AlertTriangle size={22} />
          </div>
          Ops Manager Review
        </h1>
        <p className="page-header__subtitle">
          {branch} · {period} · {total} jobs flagged for management review
        </p>
      </div>

      {sectionNames.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No jobs flagged for Ops Manager review
          </div>
        </div>
      ) : (
        <>
          {/* Quick Access Tabs */}
          <div style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
              Jump to Section
            </div>
            <div style={{ 
              display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingBottom: '0.75rem'
            }}>
              {sectionNames.map(name => {
                const count = sections[name]?.length || 0;
                const colour = FLAG_COLOURS[name]?.hex || sectionColours[name] || '#6366f1';
                const shortName = SHORT_NAMES[name] || name.replace('Jobs pending invoicing', '').replace('Jobs', '').trim();
                
                return (
                  <button
                    key={`jump-${name}`}
                    className="jump-pill"
                    onClick={() => {
                      const el = document.getElementById(`section-${name.replace(/\s+/g, '-')}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (!expanded[name]) {
                          setExpanded(prev => ({ ...prev, [name]: true }));
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

          {sectionNames.map(name => {
          const jobs = sections[name];
          const isOpen = expanded[name] ?? true;
          // Use flag color if available, otherwise section color, otherwise default
          const colour = FLAG_COLOURS[name]?.hex || sectionColours[name] || '#6366f1';

          return (
            <div key={name} id={`section-${name.replace(/\s+/g, '-')}`} className="card" style={{ borderLeftColor: colour, borderLeftWidth: 3, scrollMarginTop: '2rem' }}>
              <div
                className="card__header"
                onClick={() => setExpanded(prev => ({ ...prev, [name]: !prev[name] }))}
              >
                <div className="card__header-left">
                  <div className="card__header-icon" style={{
                    background: `${colour}18`, borderColor: `${colour}30`, color: colour,
                  }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="card__title">{name}</span>
                      <span className="card__count" style={{
                        background: `${colour}15`, color: colour,
                      }}>
                        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                    {FLAG_DESCRIPTIONS[name] && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--fg-muted)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        opacity: 0.8,
                      }}>
                        {FLAG_DESCRIPTIONS[name]}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={`card__chevron ${isOpen ? 'card__chevron--open' : ''}`}
                />
              </div>

              {isOpen && <JobTable jobs={jobs} />}
            </div>
          );
        })}
        </>
      )}
    </div>
  );
}
