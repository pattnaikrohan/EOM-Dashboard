/**
 * Dashboard Page — Branch-level global overview.
 */
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Label, Legend as ReLegend
} from 'recharts';
import { ArrowUpRight, Upload } from 'lucide-react';
import { useData } from '../context/DataContext';
import KPICards from '../components/KPICards';
import { formatCurrency, FLAG_COLOURS, FLAG_PRIORITY } from '../utils/constants';

const PIE_COLORS = FLAG_PRIORITY.filter(f => f !== 'CLEAN').map(f => FLAG_COLOURS[f]?.hex || '#ccc');

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
        minWidth: '160px'
      }}>
        <p style={{ margin: 0, fontWeight: 900, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
          Operator: {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color || entry.fill }}></div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{entry.name}</span>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800, marginLeft: '16px' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: payload[0].payload.fill, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}></div>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {payload[0].name}
          </span>
        </div>
        <div style={{ marginTop: '10px', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
          {payload[0].value} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>Jobs</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { loaded, dashboard, branch, period } = useData();
  const navigate = useNavigate();

  if (!loaded || !dashboard) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state__icon">
          <Upload size={36} />
        </div>
        <h2 className="empty-state__title">No Data Loaded</h2>
        <p className="empty-state__text">
          Upload a CargoWise export or WIP Review file to get started
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => navigate('/upload')}
        >
          <Upload size={16} /> Upload File
        </button>
      </div>
    );
  }

  const { kpi, operators, flag_distribution } = dashboard;

  // Chart data
  const operatorBarData = operators
    .filter(op => op.total_jobs > 0)
    .map(op => ({
      name: op.code,
      Jobs: op.total_jobs,
      Loss: op.loss_count,
      WIP: op.wip_count,
    }));

  const flagPieData = FLAG_PRIORITY
    .filter(f => f !== 'CLEAN' && (flag_distribution[f] || 0) > 0)
    .map(f => ({
      name: f,
      value: flag_distribution[f] || 0,
    }));

  const flaggedJobsCount = kpi.total_jobs - kpi.clean_jobs;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__overline">Branch Overview</div>
        <h1 className="page-header__title">
          EOM Review — {branch} — {period}
        </h1>
        <p className="page-header__subtitle">
          {kpi.total_jobs} active jobs across {operators.length} operators ·
          Revenue: {formatCurrency(kpi.total_revenue)} · P&L: {formatCurrency(kpi.total_profit)}
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards kpi={kpi} />

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Operator Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
            Jobs by Operator
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={operatorBarData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="colorWIP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                </linearGradient>
                <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.08"/>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
              <ReLegend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }} />
              <Bar dataKey="Jobs" fill="url(#colorJobs)" radius={[6, 6, 0, 0]} animationDuration={1500} filter="url(#barShadow)" />
              <Bar dataKey="Loss" fill="url(#colorLoss)" radius={[6, 6, 0, 0]} animationDuration={1500} filter="url(#barShadow)" />
              <Bar dataKey="WIP" fill="url(#colorWIP)" radius={[6, 6, 0, 0]} animationDuration={1500} filter="url(#barShadow)" />
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
                          <tspan x={cx} dy="-0.1em" fontSize="2rem" fontWeight="900" fill="#0f172a">{flaggedJobsCount}</tspan>
                          <tspan x={cx} dy="1.8em" fontSize="0.6rem" fontWeight="800" fill="#64748b" letterSpacing="0.1em">FLAGGED</tspan>
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
            <thead>
              <tr>
                <th>Operator</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Export</th>
                <th style={{ textAlign: 'right' }}>Import</th>
                <th style={{ textAlign: 'right' }}>Loss</th>
                <th style={{ textAlign: 'right' }}>WIP</th>
                <th style={{ textAlign: 'right' }}>Margin &lt;5%</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'right' }}>Profit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators.map(op => (
                <tr key={op.code} onClick={() => navigate(`/operator/${op.code}`)}>
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
                  <td className="cell-number">{formatCurrency(op.total_revenue)}</td>
                  <td className={`cell-number ${op.total_profit < 0 ? 'cell-number--negative' : 'cell-number--positive'}`}>
                    {formatCurrency(op.total_profit)}
                  </td>
                  <td>
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
