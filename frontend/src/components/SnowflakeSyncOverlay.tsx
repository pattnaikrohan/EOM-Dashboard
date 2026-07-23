/**
 * SnowflakeSyncOverlay v3 — Cinematic data pipeline animation.
 *
 * Entrance: The overlay fades in from transparent with a soft blur reveal,
 * then elements stagger in one by one (glow → crystal → title → stage → progress).
 *
 * Main: Mesh gradient background, floating data nodes connected by pulsing lines,
 * a breathing central crystal, and a morphing progress ring.
 */
import { useState, useEffect, useMemo } from 'react';

const STAGES = [
  { text: 'Establishing secure connection…', sub: 'Authenticating with Snowflake' },
  { text: 'Querying shipment data…', sub: 'Running VW_EOM_JOBS_SUMMARY' },
  { text: 'Streaming live records…', sub: 'Transferring from cloud warehouse' },
  { text: 'Processing job entries…', sub: 'Applying flag rules & checkers' },
  { text: 'Building summaries…', sub: 'Computing operator analytics' },
  { text: 'Finalizing dashboard…', sub: 'Preparing visualizations' },
];

interface Props {
  visible: boolean;
  onComplete?: () => void;
}

export default function SnowflakeSyncOverlay({ visible, onComplete }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'entering' | 'active' | 'exiting'>('idle');

  // Generate stable random positions for data nodes
  const dataNodes = useMemo(() =>
    Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    })), []);

  // Phase transitions: idle → entering → active → exiting → idle
  useEffect(() => {
    if (visible && phase === 'idle') {
      setPhase('entering');
      setStageIndex(0);
      // After entrance animation, go active
      const timer = setTimeout(() => setPhase('active'), 1200);
      return () => clearTimeout(timer);
    }
  }, [visible, phase]);

  // Cycle stages while active
  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => {
      setStageIndex(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, [phase]);

  // When sync completes (visible goes false while active)
  useEffect(() => {
    if (!visible && (phase === 'active' || phase === 'entering')) {
      setPhase('exiting');
      const timer = setTimeout(() => {
        setPhase('idle');
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, phase, onComplete]);

  if (phase === 'idle') return null;

  const progress = Math.min(((stageIndex + 1) / STAGES.length) * 100, 100);
  const isEntering = phase === 'entering';
  const isExiting = phase === 'exiting';

  return (
    <div className={`sync-overlay ${isEntering ? 'sync-overlay--enter' : ''} ${isExiting ? 'sync-overlay--exit' : ''}`}>
      {/* Mesh gradient background layers */}
      <div className="sync-mesh" />
      <div className="sync-mesh sync-mesh--2" />
      <div className="sync-mesh sync-mesh--3" />

      {/* Grid pattern */}
      <div className="sync-grid" />

      {/* Floating data nodes with connections */}
      <div className="sync-nodes">
        {dataNodes.map((node, i) => (
          <div
            key={i}
            className="sync-node"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: `${node.size}px`,
              height: `${node.size}px`,
              animationDelay: `${node.delay}s`,
              animationDuration: `${node.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Scanning line */}
      <div className="sync-scanline" />

      {/* Central content — staggered entrance */}
      <div className="sync-overlay__content">
        {/* Progress ring */}
        <div className={`sync-ring-container ${isEntering ? 'sync-stagger-1' : ''}`}>
          <svg className="sync-progress-ring" viewBox="0 0 120 120" width="140" height="140">
            {/* Background ring */}
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="1.5" />
            {/* Progress arc */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="url(#syncGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${progress * 3.267} ${326.7 - progress * 3.267}`}
              strokeDashoffset="81.675"
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
            />
            {/* Glow ring */}
            <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(56,189,248,0.04)" strokeWidth="8" />
            <defs>
              <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>
          </svg>
          {/* Inner snowflake */}
          <div className="sync-inner-crystal">
            <svg viewBox="0 0 100 100" width="44" height="44">
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                  <line x1="50" y1="50" x2="50" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                  <line x1="50" y1="26" x2="41" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                  <line x1="50" y1="26" x2="59" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                  <line x1="50" y1="36" x2="44" y2="31" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                  <line x1="50" y1="36" x2="56" y2="31" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                </g>
              ))}
              <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className={`sync-overlay__title-group ${isEntering ? 'sync-stagger-2' : ''}`}>
          <h1 className="sync-overlay__title">Syncing from Snowflake</h1>
          <p className="sync-overlay__subtitle">Live data pipeline active</p>
        </div>

        {/* Stage text */}
        <div className={`sync-overlay__stage-group ${isEntering ? 'sync-stagger-3' : ''}`} key={stageIndex}>
          <div className="sync-overlay__stage-text">{STAGES[stageIndex].text}</div>
          <div className="sync-overlay__stage-sub">{STAGES[stageIndex].sub}</div>
        </div>

        {/* Progress bar */}
        <div className={`sync-overlay__progress-section ${isEntering ? 'sync-stagger-4' : ''}`}>
          <div className="sync-overlay__progress-track">
            <div className="sync-overlay__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="sync-overlay__progress-label">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Step indicators */}
        <div className={`sync-overlay__steps ${isEntering ? 'sync-stagger-5' : ''}`}>
          {STAGES.map((_, i) => (
            <div key={i} className={`sync-step ${i < stageIndex ? 'sync-step--done' : ''} ${i === stageIndex ? 'sync-step--active' : ''}`}>
              <div className="sync-step__dot" />
              {i < STAGES.length - 1 && <div className="sync-step__line" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
