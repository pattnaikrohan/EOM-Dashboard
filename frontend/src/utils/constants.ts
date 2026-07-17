/**
 * API Configuration and Constants
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const FLAG_COLOURS: Record<string, { colour: string; hex: string; bg: string; border: string; text: string; className: string }> = {
  'EXPORTS Jobs pending invoicing':   { colour: 'Blue',   hex: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.2)',   text: '#1d4ed8', className: 'flag-badge--exports' },
  'CROSS-TRADE Jobs pending invoicing':{ colour: 'Violet', hex: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)', text: '#6d28d9', className: 'flag-badge--cross-trade' },
  'IMPORTS B Jobs pending invoicing': { colour: 'Indigo', hex: '#6366F1', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.2)',   text: '#4338ca', className: 'flag-badge--imports-b' },
  'IMPORTS S Jobs pending invoicing': { colour: 'Cyan',   hex: '#06B6D4', bg: 'rgba(6,182,212,0.12)',    border: 'rgba(6,182,212,0.2)',    text: '#0e7490', className: 'flag-badge--imports-s' },
  'IMPORTS Jobs pending invoicing':   { colour: 'Indigo', hex: '#6366F1', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.2)',   text: '#4338ca', className: 'flag-badge--imports' },
  'DOMESTIC Jobs pending invoicing':  { colour: 'Lime',   hex: '#84CC16', bg: 'rgba(132,204,22,0.12)',   border: 'rgba(132,204,22,0.2)',   text: '#4d7c0f', className: 'flag-badge--domestic' },
  'Unbilled Jobs with PROFIT':        { colour: 'Emerald',hex: '#10B981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.2)',   text: '#047857', className: 'flag-badge--unbilled-profit' },
  'Unbilled Jobs with LOSS':          { colour: 'Red',    hex: '#EF4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.2)',    text: '#b91c1c', className: 'flag-badge--unbilled-loss' },
  'Jobs with WIPs':                   { colour: 'Orange', hex: '#F97316', bg: 'rgba(249,115,22,0.12)',   border: 'rgba(249,115,22,0.2)',   text: '#c2410c', className: 'flag-badge--wips' },
  'Billed Jobs with LOSS':            { colour: 'Rose',   hex: '#F43F5E', bg: 'rgba(244,63,94,0.12)',    border: 'rgba(244,63,94,0.2)',    text: '#be123c', className: 'flag-badge--billed-loss' },
  'Billed Jobs with LOW MARGIN':      { colour: 'Yellow', hex: '#EAB308', bg: 'rgba(234,179,8,0.15)',    border: 'rgba(234,179,8,0.3)',    text: '#a16207', className: 'flag-badge--low-margin' },
  'Billed Jobs — EXTREME Profit':     { colour: 'Green',  hex: '#22C55E', bg: 'rgba(34,197,94,0.12)',    border: 'rgba(34,197,94,0.2)',    text: '#15803d', className: 'flag-badge--extreme-profit' },
  'Jobs at INV Status':               { colour: 'Slate',  hex: '#64748B', bg: 'rgba(100,116,139,0.12)',  border: 'rgba(100,116,139,0.2)',  text: '#334155', className: 'flag-badge--inv-status' },
  'Jobs at CMP — Ready to CLOSE':     { colour: 'Teal',   hex: '#14B8A6', bg: 'rgba(20,184,166,0.12)',   border: 'rgba(20,184,166,0.2)',   text: '#0f766e', className: 'flag-badge--ready-close' },
  'Jobs with Aged Accruals':          { colour: 'Amber',  hex: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.2)',   text: '#b45309', className: 'flag-badge--aged-accruals' },
};

export const FLAG_PRIORITY = [
  'EXPORTS Jobs pending invoicing',
  'CROSS-TRADE Jobs pending invoicing',
  'IMPORTS B Jobs pending invoicing',
  'IMPORTS S Jobs pending invoicing',
  'IMPORTS Jobs pending invoicing',
  'DOMESTIC Jobs pending invoicing',
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

export const FLAG_DESCRIPTIONS: Record<string, string> = {
  'EXPORTS Jobs pending invoicing':     'Jobs departing this month requiring invoicing',
  'IMPORTS B Jobs pending invoicing':   'Jobs arriving this month requiring invoicing',
  'IMPORTS S Jobs pending invoicing':   'Jobs arriving this month requiring invoicing',
  'IMPORTS Jobs pending invoicing':     'Jobs arriving this month requiring invoicing',
  'CROSS-TRADE Jobs pending invoicing': 'Jobs arriving this month requiring invoicing',
  'DOMESTIC Jobs pending invoicing':    'Jobs departing this month requiring invoicing',
  'Jobs at INV Status':                 'Jobs to be updated to CMP upon invoice completion and accruals entered',
};

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
