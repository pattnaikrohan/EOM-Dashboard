/**
 * PremiumLoader — State-of-the-art loading screen with real-time 0-100% progress bar,
 * live job counter, stage indicator, and glowing animated gradient track.
 */
import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { getSyncProgress } from '../services/api';
import type { SyncProgress } from '../services/api';

interface PremiumLoaderProps {
  text?: string;
  progress?: number;
  stage?: string;
  current?: number;
  total?: number;
  livePoll?: boolean;
}

export default function PremiumLoader({
  text = 'Loading EOM Data...',
  progress: customProgress,
  stage: customStage,
  current: customCurrent,
  total: customTotal,
  livePoll = true,
}: PremiumLoaderProps) {
  const [syncState, setSyncState] = useState<SyncProgress>({
    status: 'running',
    stage: customStage || 'Connecting to Snowflake Cloud Database...',
    percent: customProgress !== undefined ? customProgress : 15,
    current: customCurrent || 0,
    total: customTotal || 49294,
  });

  useEffect(() => {
    if (customProgress !== undefined) {
      setSyncState({
        status: 'running',
        stage: customStage || 'Processing...',
        percent: customProgress,
        current: customCurrent || 0,
        total: customTotal || 0,
      });
      return;
    }

    if (!livePoll) return;

    let isMounted = true;
    const pollProgress = async () => {
      try {
        const prog = await getSyncProgress();
        if (isMounted && prog) {
          setSyncState(prev => ({
            ...prog,
            // Smoothly increment percent if server status is idle/running
            percent: prog.status === 'completed' ? 100 : Math.max(prev.percent, prog.percent || 15),
          }));
        }
      } catch (err) {
        /* silent */
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 400);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [customProgress, customStage, customCurrent, customTotal, livePoll]);

  const displayPercent = Math.min(100, Math.max(0, Math.round(syncState.percent)));
  const displayStage = syncState.stage || text;
  const hasCount = syncState.total > 0 && syncState.current > 0;

  return (
    <div className="premium-loader-wrapper fade-in" style={{ padding: '4rem 1.5rem' }}>
      {/* 3D Animated Grid Cubes */}
      <div className="data-flow-grid">
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
      </div>

      {/* Main Status Text */}
      <div className="premium-loader-text" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        {text}
      </div>

      {/* Real-time Progress Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        {/* Header line: Stage info & live status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', fontWeight: 700 }}>
            <Database size={15} className="pulse-slow" />
            <span>Snowflake Live Pipeline</span>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: '#ffffff',
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
          }}>
            {displayPercent}%
          </div>
        </div>

        {/* Real Progress Bar Track */}
        <div style={{
          width: '100%',
          height: '10px',
          background: '#f1f5f9',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            height: '100%',
            width: `${displayPercent}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
            borderRadius: '9999px',
            transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
            position: 'relative'
          }}>
            {/* Shimmer sweep animation */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
              animation: 'shimmer-sweep 1.8s infinite'
            }} />
          </div>
        </div>

        {/* Footer line: Stage text & Job Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem', color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
            {displayStage}
          </div>
          {hasCount && (
            <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {syncState.current.toLocaleString()} / {syncState.total.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
