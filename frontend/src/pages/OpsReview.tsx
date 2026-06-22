/**
 * OpsReview — Cross-operator Ops Manager review page.
 */
import { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getOpsReview } from '../services/api';
import type { Job } from '../services/api';
import JobTable from '../components/JobTable';

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
        setSections(data.sections);
        setTotal(data.total);
        setBranch(data.branch);
        setPeriod(data.period);
        const exp: Record<string, boolean> = {};
        Object.keys(data.sections).forEach(s => { exp[s] = true; });
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
    'JFC': '#C084FC',
    'RDD <5%': '#F59E0B',
    'B-Jobs': '#94a3b8',
    'Unacceptable Department Codes': '#ef4444',
    'JFC Opportunity': '#93C5FD',
    'Loss': '#FF4C4C',
    'Margin <5%': '#FFF176',
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
        sectionNames.map(name => {
          const jobs = sections[name];
          const isOpen = expanded[name] ?? true;
          const colour = sectionColours[name] || '#6366f1';

          return (
            <div key={name} className="card" style={{ borderLeftColor: colour, borderLeftWidth: 3 }}>
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
                  <span className="card__title">{name}</span>
                  <span className="card__count" style={{
                    background: `${colour}15`, color: colour,
                  }}>
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className={`card__chevron ${isOpen ? 'card__chevron--open' : ''}`}
                />
              </div>

              {isOpen && <JobTable jobs={jobs} />}
            </div>
          );
        })
      )}
    </div>
  );
}
