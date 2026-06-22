/**
 * FlagBadge — Colour-coded badge for job flags.
 */
import { FLAG_COLOURS } from '../utils/constants';

interface FlagBadgeProps {
  flag: string;
  size?: 'sm' | 'md';
}

export default function FlagBadge({ flag, size = 'sm' }: FlagBadgeProps) {
  const info = FLAG_COLOURS[flag];
  if (!info) return <span className="flag-badge flag-badge--clean">{flag}</span>;

  return (
    <span
      className={`flag-badge ${info.className}`}
      style={size === 'md' ? { fontSize: '0.75rem', padding: '0.2rem 0.7rem' } : undefined}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: info.hex, display: 'inline-block', flexShrink: 0,
      }} />
      {flag}
    </span>
  );
}
