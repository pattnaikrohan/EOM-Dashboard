/**
 * PremiumLoader — High-performance loading component with smooth row counter,
 * live stage indicators, glowing animated progress bar, and instant transition when 100% ready.
 */
import { useEffect, useState } from 'react';
import { Database, CheckCircle2 } from 'lucide-react';
import { getSyncProgress } from '../services/api';

interface PremiumLoaderProps {
  text?: string;
  progress?: number;
  stage?: string;
  current?: number;
  total?: number;
  livePoll?: boolean;
  onComplete?: () => void;
}

export default function PremiumLoader({
  text = 'Loading EOM Dashboard Data...',
  progress: customProgress,
  stage: customStage,
  current: customCurrent,
  total: customTotal = 49294,
  livePoll = false,
  onComplete,
}: PremiumLoaderProps) {
  const [percent, setPercent] = useState<number>(customProgress !== undefined ? customProgress : 10);
  const [rows, setRows] = useState<number>(customCurrent || 0);
  const [stageText, setStageText] = useState<string>(customStage || 'Fetching CargoWise job records...');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (customProgress !== undefined) {
      setPercent(customProgress);
      if (customCurrent !== undefined) setRows(customCurrent);
      if (customStage) setStageText(customStage);

      if (customProgress >= 100 && !isCompleted) {
        setIsCompleted(true);
        if (onComplete) onComplete();
      }
      return;
    }

    if (livePoll) {
      let isMounted = true;
      const pollProgress = async () => {
        try {
          const prog = await getSyncProgress();
          if (isMounted && prog && prog.status === 'running') {
            setPercent(prog.percent || 15);
            setRows(prog.current || 0);
            setStageText(prog.stage || 'Fetching Snowflake records...');
          }
        } catch { /* silent */ }
      };

      pollProgress();
      const interval = setInterval(pollProgress, 300);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    // Default page load progress & row counter simulation
    const totalTargetRows = customTotal || 49294;
    let currentPct = 12;
    let currentFetchedRows = 0;

    const timer = setInterval(() => {
      currentPct += Math.floor(Math.random() * 14) + 8;
      if (currentPct > 94) {
        currentPct = 94;
        currentFetchedRows = Math.floor(totalTargetRows * 0.94);
      } else {
        currentFetchedRows = Math.floor(totalTargetRows * (currentPct / 100));
      }

      setPercent(currentPct);
      setRows(currentFetchedRows);

      if (currentPct < 35) {
        setStageText('Connecting to Snowflake Data Store...');
      } else if (currentPct < 70) {
        setStageText(`Parsing CargoWise job records...`);
      } else {
        setStageText(`Finalizing KPIs & Flag Rules...`);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [customProgress, customCurrent, customStage, customTotal, livePoll, onComplete, isCompleted]);

  const displayPercent = Math.min(100, Math.max(0, Math.round(percent)));
  const targetTotal = customTotal || 49294;

  return (
    <div className="premium-loader-wrapper fade-in" style={{ padding: '4rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

      {/* Title Header */}
      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.25rem', textAlign: 'center' }}>
        {text}
      </div>

      {/* Main Loader Box */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 12px 35px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        {/* Top Header line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: displayPercent === 100 ? '#10b981' : '#3b82f6', fontWeight: 700 }}>
            {displayPercent === 100 ? (
              <CheckCircle2 size={16} color="#10b981" />
            ) : (
              <Database size={16} className="pulse-slow" color="#3b82f6" />
            )}
            <span>{displayPercent === 100 ? 'Pipeline Ready' : 'Snowflake Live Pipeline'}</span>
          </div>

          <div style={{
            background: displayPercent === 100 ? '#10b981' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: '#ffffff',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.775rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            {displayPercent}%
          </div>
        </div>

        {/* Real Progress Track */}
        <div style={{
          width: '100%',
          height: '10px',
          background: '#f1f5f9',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            height: '100%',
            width: `${displayPercent}%`,
            background: displayPercent === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
            borderRadius: '9999px',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
            position: 'relative'
          }}>
            {displayPercent < 100 && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)',
                animation: 'shimmer-sweep 1.5s infinite'
              }} />
            )}
          </div>
        </div>

        {/* Footer: Live Row Counter & Stage Text */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem' }}>
          <div style={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '270px' }}>
            {stageText}
          </div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            Fetched {rows.toLocaleString()} / {targetTotal.toLocaleString()} rows
          </div>
        </div>
      </div>
    </div>
  );
}
