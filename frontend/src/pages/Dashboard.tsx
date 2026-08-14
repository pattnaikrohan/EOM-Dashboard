/**
 * Dashboard Page — Branch-level global overview with actionable EOM analytics.
 */
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Label,
  RadialBarChart, RadialBar,
} from 'recharts';
import { ArrowUpRight, Upload, Database, TrendingUp, AlertTriangle, Shield, Package } from 'lucide-react';
import { useData } from '../context/DataContext';
import KPICards from '../components/KPICards';
import PremiumLoader from '../components/PremiumLoader';
import { FLAG_COLOURS, FLAG_PRIORITY } from '../utils/constants';

const PIE_COLORS = FLAG_PRIORITY.filter(f => f !== 'CLEAN').map(f => FLAG_COLOURS[f]?.hex || '#ccc');

/* ── Shared Tooltip Styles ────────────────────────────────────────────────── */
const tooltipBox: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  padding: '14px 16px',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
  minWidth: '150px',
};

/* ── Custom Tooltips ──────────────────────────────────────────────────────── */
const RiskTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <p style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
        {label}
      </p>
      {payload.map((e: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color || e.fill }} />
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{e.name}</span>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{e.value}</span>
        </div>
      ))}
    </div>
  );
};

const CheckerTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <p style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.78rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px' }}>
        {label}
      </p>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: payload[0]?.color || '#3b82f6' }}>
        {payload[0]?.value} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>jobs</span>
      </div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: payload[0].payload.fill, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {payload[0].name}
        </span>
      </div>
      <div style={{ marginTop: '10px', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
        {payload[0].value} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>Jobs</span>
      </div>
    </div>
  );
};

const DirectionTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].payload.fill }} />
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>{payload[0].name}</span>
      </div>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
        {payload[0].value.toLocaleString()} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>jobs</span>
      </div>
    </div>
  );
};

/* ── Direction Colors ─────────────────────────────────────────────────────── */
const DIR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

export default function Dashboard() {
  const { loaded, dashboard, loading } = useData();
  const navigate = useNavigate();

  if (loading && !loaded) {
    return (
      <div style={{ padding: '6rem' }}>
        <PremiumLoader text="Loading Dashboard Data..." />
      </div>
    );
  }

  if (!loaded || !dashboard) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state__icon">
          <Upload size={36} />
        </div>
        <h2 className="empty-state__title">No Data Loaded</h2>
        <p className="empty-state__text">
          Upload a CargoWise export or WIP Review file to get started, or pull live data directly from Snowflake.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/upload')}
          >
            <Upload size={16} /> Upload File
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
          >
            <Database size={16} /> Sync from Snowflake
          </button>
        </div>
      </div>
    );
  }

  const { kpi, operators, flag_distribution } = dashboard;

  /* ── EOM Readiness Gauge ────────────────────────────────────────────────── */
  const cleanPct = kpi.total_jobs > 0 ? Math.round((kpi.clean_jobs / kpi.total_jobs) * 100) : 0;
  const gaugeData = [{ name: 'Readiness', value: cleanPct, fill: cleanPct >= 80 ? '#22c55e' : cleanPct >= 50 ? '#f59e0b' : '#ef4444' }];

  /* ── Risk Heatmap — Top 10 operators by flagged jobs ────────────────────── */
  const sortedOps = [...operators]
    .filter(op => op.total_jobs > 0)
    .map(op => ({
      ...op,
      flagged: op.loss_count + op.wip_count + op.margin_count + op.zero_rev_count,
    }))
    .sort((a, b) => b.flagged - a.flagged);

  const riskData = sortedOps.slice(0, 10).map(op => ({
    name: op.code,
    Loss: op.loss_count,
    WIP: op.wip_count,
    'Low Margin': op.margin_count,
    'No Revenue': op.zero_rev_count,
  }));

  /* ── Checker Health ─────────────────────────────────────────────────────── */
  const checkerData = [
    { name: 'Loss Jobs', value: kpi.loss_jobs, color: '#ef4444' },
    { name: 'WIP Jobs', value: kpi.has_wip, color: '#f59e0b' },
    { name: 'Zero Rev >3M', value: kpi.zero_rev_3m, color: '#8b5cf6' },
    { name: 'Margin <5%', value: kpi.margin_below_5, color: '#ec4899' },
    { name: 'Accrual Check', value: kpi.accrual_check, color: '#06b6d4' },
    { name: 'JFC Jobs', value: kpi.jfc_jobs, color: '#14b8a6' },
  ].filter(c => c.value > 0);

  /* ── Direction Split ────────────────────────────────────────────────────── */
  const directionData = [
    { name: 'Export', value: kpi.export_jobs },
    { name: 'Import', value: kpi.import_jobs },
    { name: 'Cross-Trade', value: kpi.cross_trade_jobs },
  ].filter(d => d.value > 0);

  /* ── Flag Distribution Pie ─────────────────────────────────────────────── */
  const flagPieData = FLAG_PRIORITY
    .filter(f => f !== 'CLEAN' && (flag_distribution[f] || 0) > 0)
    .map(f => ({
      name: f,
      value: flag_distribution[f] || 0,
    }));
  const flaggedJobsCount = (kpi.total_jobs || 0) - (kpi.clean_jobs || 0);

  /* ── Revenue & Profit KPIs ─────────────────────────────────────────────── */
  const marginPct = kpi.total_revenue > 0 ? ((kpi.total_profit / kpi.total_revenue) * 100).toFixed(1) : '0.0';
  const avgRevPerJob = kpi.total_jobs > 0 ? kpi.total_revenue / kpi.total_jobs : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__overline">Branch Overview</div>
        <h1 className="page-header__title">
          EOM Review — Analytics Dashboard
        </h1>
        <p className="page-header__subtitle">
          {kpi.total_jobs.toLocaleString()} active jobs across {operators.length} operators
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards kpi={kpi} />

      {/* ── ROW 1: Mini KPI Stat Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* EOM Readiness */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: cleanPct >= 80 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : cleanPct >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}>
            <Shield size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--fg-base)', lineHeight: 1 }}>{cleanPct}%</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>EOM Ready</div>
          </div>
        </div>

        {/* Overall Margin */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 6px 16px rgba(59,130,246,0.2)',
          }}>
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--fg-base)', lineHeight: 1 }}>{marginPct}%</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Overall Margin</div>
          </div>
        </div>

        {/* Jobs at Risk */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 6px 16px rgba(239,68,68,0.2)',
          }}>
            <AlertTriangle size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--fg-base)', lineHeight: 1 }}>{flaggedJobsCount.toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Flagged Jobs</div>
          </div>
        </div>

        {/* Avg Revenue/Job */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 6px 16px rgba(139,92,246,0.2)',
          }}>
            <Package size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--fg-base)', lineHeight: 1 }}>${avgRevPerJob >= 1000 ? `${(avgRevPerJob / 1000).toFixed(1)}k` : avgRevPerJob.toFixed(0)}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Avg Rev/Job</div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Risk Heatmap + EOM Readiness Gauge ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Top 10 Operators by Risk */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Top 10 Operators by Risk
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: '1rem', marginTop: 0 }}>
            Operators with the most flagged jobs requiring attention
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData} layout="vertical" barGap={2} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradLoss" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fca5a5" /><stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="gradWIP" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="gradMargin" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f9a8d4" /><stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="gradNoRev" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<RiskTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Bar dataKey="Loss" stackId="risk" fill="url(#gradLoss)" radius={[0, 0, 0, 0]} animationDuration={1200} />
              <Bar dataKey="WIP" stackId="risk" fill="url(#gradWIP)" radius={[0, 0, 0, 0]} animationDuration={1200} />
              <Bar dataKey="Low Margin" stackId="risk" fill="url(#gradMargin)" radius={[0, 0, 0, 0]} animationDuration={1200} />
              <Bar dataKey="No Revenue" stackId="risk" fill="url(#gradNoRev)" radius={[0, 4, 4, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
          {/* Inline legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            {[
              { label: 'Loss', color: '#ef4444' },
              { label: 'WIP', color: '#f59e0b' },
              { label: 'Low Margin', color: '#ec4899' },
              { label: 'No Revenue', color: '#8b5cf6' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* EOM Readiness Gauge + Direction Split */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Radial Gauge */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'left' }}>
              EOM Readiness
            </h3>
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="70%" outerRadius="90%"
                startAngle={180} endAngle={0}
                data={gaugeData}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: '#f1f5f9' }}
                  animationDuration={1500}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                  <tspan fontSize="2rem" fontWeight="900" fill="var(--fg-base)">{cleanPct}%</tspan>
                </text>
                <text x="50%" y="65%" textAnchor="middle">
                  <tspan fontSize="0.6rem" fontWeight="800" fill="#94a3b8" letterSpacing="0.1em">CLEAN JOBS</tspan>
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22c55e' }}>{kpi.clean_jobs.toLocaleString()}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Clean</div>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>{flaggedJobsCount.toLocaleString()}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Flagged</div>
              </div>
            </div>
          </div>

          {/* Direction Split mini donut */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Direction Split
            </h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: '1 1 55%' }}>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={directionData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} cornerRadius={4} dataKey="value" stroke="none" animationDuration={1200}>
                      {directionData.map((_e, i) => (
                        <Cell key={i} fill={DIR_COLORS[i % DIR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DirectionTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {directionData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: DIR_COLORS[i], flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{d.name}</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Checker Health + Flag Distribution ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Checker Health */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Month End Checker Health
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: '1rem', marginTop: 0 }}>
            Jobs flagged per EOM check category
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={checkerData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CheckerTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1200} maxBarSize={48}>
                {checkerData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flag Distribution Pie + Legend */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
            Flag Distribution
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {/* Donut Chart */}
            <div style={{ flex: '1 1 55%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={flagPieData}
                    cx="50%" cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    cornerRadius={6}
                    dataKey="value"
                    animationDuration={1500}
                    stroke="none"
                  >
                    <Label
                      content={({ viewBox: { cx, cy } }: any) => (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                          <tspan x={cx} dy="-0.1em" fontSize="2rem" fontWeight="900" fill="var(--fg-base)">{flaggedJobsCount}</tspan>
                          <tspan x={cx} dy="1.8em" fontSize="0.6rem" fontWeight="800" fill="var(--fg-muted)" letterSpacing="0.1em">FLAGGED</tspan>
                        </text>
                      )}
                    />
                    {flagPieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[FLAG_PRIORITY.filter(f => f !== 'CLEAN').indexOf(flagPieData[index]?.name)] || '#ccc'}
                        stroke="#ffffff"
                        strokeWidth={3}
                        style={{ outline: 'none', transition: 'all 0.3s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Compact Legend */}
            <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
              {flagPieData.map((entry, index) => {
                const color = PIE_COLORS[FLAG_PRIORITY.filter(f => f !== 'CLEAN').indexOf(entry.name)] || '#ccc';
                const totalFlagged = flagPieData.reduce((s, e) => s + e.value, 0);
                const pct = totalFlagged > 0 ? ((entry.value / totalFlagged) * 100).toFixed(0) : '0';
                return (
                  <div key={`legend-${index}`} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', borderRadius: '8px',
                    background: '#f8fafc', border: '1px solid #f1f5f9',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 600, color: '#334155', lineHeight: 1.2 }}>{entry.name}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a', minWidth: '24px', textAlign: 'right' }}>{entry.value}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', minWidth: '28px', textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Operator Breakdown Table */}
      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
          Operator Breakdown
        </h3>
        <div className="data-table-wrapper">
          <table className="operator-table">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Operator</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Export</th>
                <th style={{ textAlign: 'right' }}>Import</th>
                <th style={{ textAlign: 'right' }}>Loss</th>
                <th style={{ textAlign: 'right' }}>WIP</th>
                <th style={{ textAlign: 'right' }}>Margin &lt;5%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators.map(op => (
                <tr key={op.code} onClick={() => navigate(`/operators?operator=${encodeURIComponent(op.code)}`)} style={{ cursor: 'pointer' }}>
                  <td><span className="operator-code">{op.code}</span></td>
                  <td className="cell-number">{op.total_jobs}</td>
                  <td className="cell-number">{op.export_jobs}</td>
                  <td className="cell-number">{op.import_jobs}</td>
                  <td className="cell-number" style={{ color: op.loss_count > 0 ? '#dc2626' : undefined }}>
                    {op.loss_count}
                  </td>
                  <td className="cell-number" style={{ color: op.wip_count > 0 ? '#d97706' : undefined }}>
                    {op.wip_count}
                  </td>
                  <td className="cell-number">{op.margin_count}</td>
                  <td style={{ textAlign: 'center' }}>
                    <ArrowUpRight size={14} color="#94a3b8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
