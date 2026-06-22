/**
 * API Configuration and Constants
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const FLAG_COLOURS: Record<string, { colour: string; hex: string; bg: string; border: string; text: string; className: string }> = {
  'LOSS':            { colour: 'Red',    hex: '#FF4C4C', bg: 'rgba(255,76,76,0.12)',   border: 'rgba(255,76,76,0.2)',   text: '#dc2626', className: 'flag-badge--loss' },
  'WIP':             { colour: 'Orange', hex: '#FFB347', bg: 'rgba(255,179,71,0.12)',  border: 'rgba(255,179,71,0.2)',  text: '#d97706', className: 'flag-badge--wip' },
  'JFC':             { colour: 'Purple', hex: '#C084FC', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.2)', text: '#7c3aed', className: 'flag-badge--jfc' },
  'MARGIN <5%':      { colour: 'Yellow', hex: '#FFF176', bg: 'rgba(255,241,118,0.15)', border: 'rgba(255,241,118,0.3)', text: '#b45309', className: 'flag-badge--margin' },
  'ZERO REV >3M':    { colour: 'Pink',   hex: '#FDA4AF', bg: 'rgba(253,164,175,0.12)', border: 'rgba(253,164,175,0.2)', text: '#be185d', className: 'flag-badge--zero-rev' },
  'JFC OPPORTUNITY': { colour: 'Blue',   hex: '#93C5FD', bg: 'rgba(147,197,253,0.12)', border: 'rgba(147,197,253,0.2)', text: '#1d4ed8', className: 'flag-badge--jfc-opp' },
  'ACCRUAL CHECK':   { colour: 'Amber',  hex: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)',  text: '#b45309', className: 'flag-badge--accrual' },
  'CMP OPPORTUNITY': { colour: 'Green',  hex: '#6EE7B7', bg: 'rgba(110,231,183,0.12)', border: 'rgba(110,231,183,0.2)', text: '#047857', className: 'flag-badge--cmp-opp' },
  'CLEAN':           { colour: 'White',  hex: '#E2E8F0', bg: 'rgba(226,232,240,0.3)',  border: 'rgba(226,232,240,0.5)', text: '#64748b', className: 'flag-badge--clean' },
};

export const FLAG_PRIORITY = [
  'LOSS', 'WIP', 'JFC', 'MARGIN <5%', 'ZERO REV >3M',
  'JFC OPPORTUNITY', 'ACCRUAL CHECK', 'CMP OPPORTUNITY', 'CLEAN',
];

export const STATUS_COLOURS: Record<string, string> = {
  'WRK': 'status-badge--wrk',
  'INV': 'status-badge--inv',
  'CMP': 'status-badge--cmp',
  'JFC': 'status-badge--jfc',
};

export function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatNumber(val: number, decimals = 2): string {
  return val.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
