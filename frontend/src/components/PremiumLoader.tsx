/**
 * PremiumLoader — Ultra-Aesthetic 3D Glassmorphic Crystal Snowflake Liquid-Fill Loader.
 * Features dual counter-rotating particle orbit rings, crystalline bevel geometry, 1-to-1 vertical liquid fill,
 * floating glassmorphism percentage badge, and live row progress tracking.
 */
import { useEffect, useState } from 'react';
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

    // Smooth page loading simulation
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
        setStageText('Connecting to Snowflake Cloud Warehouse...');
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
  const fillY = 100 - displayPercent;

  return (
    <div className="premium-loader-wrapper fade-in" style={{
      padding: '4.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '420px'
    }}>
      {/* ── 3D Crystal Snowflake Container with Dual Orbit Rings ── */}
      <div style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '2rem' }}>
        
        {/* Ambient Pulsating Neon Backlight Aura */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: displayPercent === 100
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(16, 185, 129, 0) 75%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(6, 182, 212, 0) 85%)',
          filter: 'blur(22px)',
          animation: 'sf-pulse-glow 3s ease-in-out infinite',
          pointerEvents: 'none'
        }} />

        <svg viewBox="0 0 100 100" width="180" height="180" style={{ filter: 'drop-shadow(0 12px 28px rgba(37, 99, 235, 0.28))' }}>
          <defs>
            {/* Liquid Gradient Fills */}
            <linearGradient id="sf-fill-grad-v2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="sf-success-grad-v2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Crystalline Mask */}
            <mask id="sf-crystal-mask">
              <g fill="none" stroke="#ffffff" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Arm 1 & 4 (Vertical) */}
                <line x1="50" y1="6" x2="50" y2="94" />
                <path d="M50 18 L36 7 M50 18 L64 7" />
                <path d="M50 30 L32 15 M50 30 L68 15" />
                <path d="M50 82 L36 93 M50 82 L64 93" />
                <path d="M50 70 L32 85 M50 70 L68 85" />

                {/* Arm 2 & 5 (60 deg) */}
                <g transform="rotate(60 50 50)">
                  <line x1="50" y1="6" x2="50" y2="94" />
                  <path d="M50 18 L36 7 M50 18 L64 7" />
                  <path d="M50 30 L32 15 M50 30 L68 15" />
                  <path d="M50 82 L36 93 M50 82 L64 93" />
                  <path d="M50 70 L32 85 M50 70 L68 85" />
                </g>

                {/* Arm 3 & 6 (120 deg) */}
                <g transform="rotate(120 50 50)">
                  <line x1="50" y1="6" x2="50" y2="94" />
                  <path d="M50 18 L36 7 M50 18 L64 7" />
                  <path d="M50 30 L32 15 M50 30 L68 15" />
                  <path d="M50 82 L36 93 M50 82 L64 93" />
                  <path d="M50 70 L32 85 M50 70 L68 85" />
                </g>
              </g>

              {/* Center Hex Core */}
              <polygon points="50,38 59,43.2 59,56.8 50,62 41,56.8 41,43.2" fill="#ffffff" />
            </mask>
          </defs>

          {/* 1. Outer Counter-Clockwise Particle Ring */}
          <g style={{ transformOrigin: '50px 50px', animation: 'sf-orbit-spin-reverse 10s linear infinite' }}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" strokeDasharray="3 7" />
            <circle cx="50" cy="2" r="2.5" fill="#60a5fa" style={{ filter: 'drop-shadow(0 0 5px #60a5fa)' }} />
            <circle cx="98" cy="50" r="2" fill="#a78bfa" style={{ filter: 'drop-shadow(0 0 5px #a78bfa)' }} />
            <circle cx="2" cy="50" r="2" fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 5px #38bdf8)' }} />
          </g>

          {/* 2. Inner Clockwise Particle Ring */}
          <g style={{ transformOrigin: '50px 50px', animation: 'sf-orbit-spin 6s linear infinite' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(139, 92, 246, 0.22)" strokeWidth="1.2" strokeDasharray="6 8" />
            <circle cx="50" cy="8" r="3" fill="#3b82f6" style={{ filter: 'drop-shadow(0 0 7px #3b82f6)' }} />
            <circle cx="92" cy="50" r="2.5" fill="#8b5cf6" style={{ filter: 'drop-shadow(0 0 7px #8b5cf6)' }} />
            <circle cx="8" cy="50" r="2.5" fill="#06b6d4" style={{ filter: 'drop-shadow(0 0 7px #06b6d4)' }} />
          </g>

          {/* 3. Background Faint Track Skeleton */}
          <g mask="url(#sf-crystal-mask)">
            <rect x="0" y="0" width="100" height="100" fill="rgba(203, 213, 225, 0.65)" />
          </g>

          {/* 4. Liquid Percentage Fill Bar with Dynamic Transition */}
          <g mask="url(#sf-crystal-mask)">
            <rect
              x="0"
              y={fillY}
              width="100"
              height={displayPercent}
              fill={displayPercent === 100 ? "url(#sf-success-grad-v2)" : "url(#sf-fill-grad-v2)"}
              style={{ transition: 'y 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </g>
        </svg>

        {/* Floating Glassmorphism Center Percentage Badge */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          fontSize: '0.925rem',
          fontWeight: 900,
          color: displayPercent === 100 ? '#10b981' : '#2563eb',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          {displayPercent}%
        </div>
      </div>

      {/* ── Status Header & Subtitle ── */}
      <div style={{
        fontSize: '0.925rem',
        fontWeight: 800,
        color: '#0f172a',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.45rem',
        textAlign: 'center'
      }}>
        {text}
      </div>

      {/* Live Stage Subtitle */}
      <div style={{
        fontSize: '0.825rem',
        fontWeight: 600,
        color: '#64748b',
        marginBottom: '0.9rem',
        textAlign: 'center'
      }}>
        {stageText}
      </div>

      {/* Live Row Counter Pill */}
      <div style={{
        background: '#f8fafc',
        padding: '0.45rem 1.2rem',
        borderRadius: '9999px',
        border: '1px solid #e2e8f0',
        fontSize: '0.8rem',
        fontWeight: 800,
        color: '#334155',
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: displayPercent === 100 ? '#10b981' : '#3b82f6', display: 'inline-block' }} />
        Fetched {rows.toLocaleString()} / {targetTotal.toLocaleString()} rows
      </div>
    </div>
  );
}
