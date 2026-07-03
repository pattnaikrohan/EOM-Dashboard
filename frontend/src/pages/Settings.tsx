/**
 * Settings — Configuration Manager & Flag Legend page showing interactive draggable flag definitions.
 */
import { useState, useEffect } from 'react';
import { Info, GripVertical, Check, X, Edit2, Plus, RotateCcw, Save, Sliders, Trash2 } from 'lucide-react';
import { getLegend, getNegMovementStatus, updatePlCategories } from '../services/api';
import type { LegendItem } from '../services/api';
import { FLAG_COLOURS } from '../utils/constants';

interface RuleConfig {
  id: string;
  category: 'Section 1 Filter' | 'Section 2 Closing Check' | 'Custom Rule';
  flag: string;
  name: string;
  condition: string;
  enabled: boolean;
  colour: string;
}

const DEFAULT_CONFIG: RuleConfig[] = [
  { id: 'f1', category: 'Section 1 Filter', flag: 'STATUS_FLT', name: 'Job Status Exclusion Filter', condition: 'Job Status ≠ CMP / IHL / CLS', enabled: true, colour: '#3b82f6' },
  { id: 'f2', category: 'Section 1 Filter', flag: 'DATE_CUTOFF', name: 'Current Month Cutoff Rule', condition: 'Departure/Arrival Date within Active Month', enabled: true, colour: '#0ea5e9' },
  { id: 'f3', category: 'Section 1 Filter', flag: 'STAFF_LK', name: 'Operator & Branch Name Mapping', condition: 'CargoWise Code Translation via Staff Listing', enabled: true, colour: '#6366f1' },
  { id: 'r1', category: 'Section 2 Closing Check', flag: 'FINANCIAL LOSS', name: 'Significant Net Job Loss', condition: 'Net Job Loss > $500.00 AUD Threshold', enabled: true, colour: '#FF4C4C' },
  { id: 'r2', category: 'Section 2 Closing Check', flag: 'ZERO REVENUE', name: 'Zero Revenue with Costs Raised', condition: 'Total Sell Revenue = $0.00 & Total Cost > $0.00', enabled: true, colour: '#FDA4AF' },
  { id: 'r3', category: 'Section 2 Closing Check', flag: 'UNBILLED WIP', name: 'Pending Unbilled Work in Progress', condition: 'Unbilled Work in Progress Balance > $0.00', enabled: true, colour: '#FFB347' },
  { id: 'r4', category: 'Section 2 Closing Check', flag: 'JFC OPPORTUNITY', name: 'Job File Closure Candidate', condition: 'Operational Status = CMP & Unbilled WIP = $0', enabled: true, colour: '#C084FC' },
  { id: 'r5', category: 'Section 2 Closing Check', flag: 'MISSING ACCRUAL', name: 'Unaccrued Known Carrier Costs', condition: 'Recorded Accrual = $0.00 & Departure Past', enabled: true, colour: '#F59E0B' },
  { id: 'r6', category: 'Section 2 Closing Check', flag: 'MARGIN EROSION', name: 'Low Gross Profit Margin Warning', condition: 'Gross Profit Margin < 10.0% Minimum Target', enabled: true, colour: '#FFF176' },
  { id: 'r7', category: 'Section 2 Closing Check', flag: 'FX MISMATCH', name: 'Foreign Exchange Rate Misalignment', condition: 'Creditor & Debtor FX Conversion Variance Check', enabled: true, colour: '#93C5FD' },
  { id: 'r8', category: 'Section 2 Closing Check', flag: 'OVERDUE CREDIT', name: 'Customer Credit Terms Breached', condition: 'Debtor Outstanding Balance Exceeds Credit Limit', enabled: true, colour: '#6EE7B7' },
  { id: 'r9', category: 'Section 2 Closing Check', flag: 'BILLING DISPUTE', name: 'Client Invoice Dispute Hold', condition: 'Disputed Invoice Hold Indicator Active', enabled: true, colour: '#E2E8F0' },
];

export default function SettingsPage() {
  const [legend, setLegend] = useState<LegendItem[]>([]);
  const [rules, setRules] = useState<RuleConfig[]>(() => {
    const saved = localStorage.getItem('aaw_dashboard_rules_v3');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; condition: string }>({ name: '', condition: '' });
  const [saveStatus, setSaveStatus] = useState(false);

  // P&L Categories state
  const [plCategories, setPlCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [plSaveStatus, setPlSaveStatus] = useState(false);

  useEffect(() => {
    getNegMovementStatus()
      .then(d => setPlCategories(d.pl_categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getLegend().then(d => setLegend(d.legend)).catch(() => {
      setLegend(Object.entries(FLAG_COLOURS).map(([flag, info]) => ({
        flag,
        colour: info.colour,
        hex_code: info.hex,
        rule: '',
      })));
    });
  }, []);

  const saveRules = (newRules: RuleConfig[]) => {
    setRules(newRules);
    localStorage.setItem('aaw_dashboard_rules_v3', JSON.stringify(newRules));
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newRules = [...rules];
    const draggedItem = newRules[draggedIdx];
    newRules.splice(draggedIdx, 1);
    newRules.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    saveRules(newRules);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const toggleRule = (id: string) => {
    const newRules = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    saveRules(newRules);
  };

  const startEdit = (r: RuleConfig) => {
    setEditingId(r.id);
    setEditForm({ name: r.name, condition: r.condition });
  };

  const saveEdit = (id: string) => {
    const newRules = rules.map(r => r.id === id ? { ...r, name: editForm.name, condition: editForm.condition } : r);
    saveRules(newRules);
    setEditingId(null);
  };

  const addCustomRule = () => {
    const newId = 'c_' + Date.now();
    const newRule: RuleConfig = {
      id: newId,
      category: 'Custom Rule',
      flag: 'CUSTOM CHECK',
      name: 'New Custom Business Rule',
      condition: 'Specify custom evaluation condition',
      enabled: true,
      colour: '#10b981'
    };
    saveRules([...rules, newRule]);
    startEdit(newRule);
  };

  const resetDefault = () => {
    if (window.confirm("Reset all dashboard rules back to the official AAW V3 standard configuration?")) {
      saveRules(DEFAULT_CONFIG);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-header__overline">Interactive Configuration</div>
          <h1 className="page-header__title">Dashboard Rules & Condition Manager</h1>
          <p className="page-header__subtitle">
            Drag to reorder evaluation priority, toggle live conditions, and customize end-of-month check parameters.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saveStatus && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Check size={16} /> Saved!
            </span>
          )}
          <button
            onClick={resetDefault}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <RotateCcw size={16} /> Reset V3 Defaults
          </button>
          <button
            onClick={addCustomRule}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
          >
            <Plus size={16} /> Add Condition
          </button>
        </div>
      </div>

      {/* Interactive Draggable Rule List */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{
          fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          <Sliders size={18} color="#3b82f6" />
          Active Processing Logic & Order Priority ({rules.filter(r => r.enabled).length}/{rules.length} Enabled)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rules.map((r, idx) => {
            const isEditing = editingId === r.id;
            return (
              <div
                key={r.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`rule-config-row ${draggedIdx === idx ? 'dragging' : ''} ${!r.enabled ? 'disabled' : ''}`}
              >
                {/* Drag Handle */}
                <div style={{ cursor: 'grab', color: 'var(--fg-faint)', display: 'flex', alignItems: 'center' }} title="Drag to reorder priority">
                  <GripVertical size={20} />
                </div>

                {/* Priority Number */}
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--fg-faint)', width: '24px' }}>
                  #{idx + 1}
                </span>

                {/* Enabled Toggle Button */}
                <button
                  onClick={() => toggleRule(r.id)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: r.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: r.enabled ? '#10b981' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.15s'
                  }}
                  title={r.enabled ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}
                >
                  {r.enabled ? <Check size={18} /> : <X size={18} />}
                </button>

                {/* Flag Swatch Tag */}
                <div style={{
                  background: r.colour, color: ['#FFF176', '#FFB347', '#E2E8F0'].includes(r.colour) ? '#0F172A' : '#FFFFFF',
                  padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                  letterSpacing: '0.05em', minWidth: '120px', textAlign: 'center', flexShrink: 0
                }}>
                  {r.flag}
                </div>

                {/* Content / Edit Form */}
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Rule Name"
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #3b82f6', background: 'var(--bg-base)', color: 'var(--fg-base)', fontSize: '0.85rem', fontWeight: 700, width: '220px' }}
                      />
                      <input
                        type="text"
                        value={editForm.condition}
                        onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                        placeholder="Evaluation Condition / Parameter"
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #3b82f6', background: 'var(--bg-base)', color: 'var(--fg-base)', fontSize: '0.85rem', flex: 1 }}
                      />
                      <button
                        onClick={() => saveEdit(r.id)}
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Save size={14} /> Save
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: r.enabled ? 'var(--fg-base)' : 'var(--fg-faint)', textDecoration: r.enabled ? 'none' : 'line-through' }}>
                        {r.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                        Condition: {r.condition}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category Badge */}
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--fg-faint)', background: 'var(--bg-subtle)', padding: '0.2rem 0.6rem', borderRadius: '6px', flexShrink: 0 }}>
                  {r.category}
                </span>

                {/* Edit Button */}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(r)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--fg-faint)', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = '#3b82f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-faint)'; }}
                    title="Edit Rule Parameters"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Official V3 Flag Reference Swatches */}
      <div className="card">
        <h3 style={{
          fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Info size={16} color="#3b82f6" />
          Flag Colour Palette Reference
        </h3>

        <div className="legend-grid">
          {legend.map(item => (
            <div key={item.flag} className="legend-item">
              <div
                className="legend-swatch"
                style={{ background: item.hex_code }}
              />
              <span className="legend-label">{item.flag}</span>
              <span className="legend-rule">{item.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* P&L Reason Categories */}
      <div className="card">
        <h3 style={{
          fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Sliders size={16} color="#ef4444" />
          Negative Movement — P&L Reason Categories
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          These categories appear in the P&L Reason dropdown when operators provide commentary on negative movement jobs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {plCategories.map((cat, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.75rem', borderRadius: 10,
              background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
            }}>
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{cat}</span>
              <button
                onClick={() => {
                  const updated = plCategories.filter((_, i) => i !== idx);
                  setPlCategories(updated);
                }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--fg-faint)', padding: '0.3rem', borderRadius: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-faint)'; }}
                title="Remove category"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Add new category..."
            style={{
              flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8,
              border: '1px solid var(--border-base)', background: 'var(--bg-base)',
              fontSize: '0.85rem', color: 'var(--fg-base)',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && newCategory.trim()) {
                setPlCategories([...plCategories, newCategory.trim()]);
                setNewCategory('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newCategory.trim()) {
                setPlCategories([...plCategories, newCategory.trim()]);
                setNewCategory('');
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.5rem 1rem', borderRadius: 8,
              background: 'var(--bg-subtle)', border: '1px solid var(--border-base)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              color: 'var(--fg-muted)', transition: 'all 0.15s',
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <button
          onClick={async () => {
            try {
              await updatePlCategories(plCategories);
              setPlSaveStatus(true);
              setTimeout(() => setPlSaveStatus(false), 2000);
            } catch (err) {
              console.error('Failed to save P&L categories:', err);
            }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.6rem 1.5rem', borderRadius: 10,
            background: plSaveStatus ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
          }}
        >
          {plSaveStatus ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Categories</>}
        </button>
      </div>
    </div>
  );
}
