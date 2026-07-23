/**
 * SnowflakeSyncOverlay — Full-page cinematic animation shown during Snowflake sync.
 * v2: Hexagonal data-node network with flowing connection lines and a central snowflake crystal.
 */
import { useState, useEffect } from 'react';

const STAGES = [
  { text: 'Establishing secure connection to Snowflake…', icon: '🔐' },
  { text: 'Querying live shipment data…', icon: '❄️' },
  { text: 'Streaming records from cloud warehouse…', icon: '📡' },
  { text: 'Processing & flagging job entries…', icon: '⚙️' },
  { text: 'Building operator summaries…', icon: '📊' },
  { text: 'Finalizing dashboard…', icon: '✨' },
];

interface Props {
  visible: boolean;
  onComplete?: () => void;
}

export default function SnowflakeSyncOverlay({ visible, onComplete }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Cycle through stages while visible
  useEffect(() => {
    if (!visible) return;
    setStageIndex(0);
    setExiting(false);
    const interval = setInterval(() => {
      setStageIndex(prev => {
        if (prev < STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [visible]);

  // When visible becomes false (sync done), play exit animation then call onComplete
  useEffect(() => {
    if (!visible && stageIndex > 0) {
      setExiting(true);
      const timer = setTimeout(() => {
        setExiting(false);
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visible, stageIndex, onComplete]);

  if (!visible && !exiting) return null;

  const progress = Math.min(((stageIndex + 1) / STAGES.length) * 100, 100);

  return (
    <div className={`sync-overlay ${exiting ? 'sync-overlay--exit' : ''}`}>
      {/* Animated aurora background */}
      <div className="sync-aurora" />
      <div className="sync-aurora sync-aurora--2" />

      {/* Floating snowflake crystals */}
      <div className="sync-overlay__particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="sync-crystal"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
              fontSize: `${8 + Math.random() * 14}px`,
              opacity: 0.15 + Math.random() * 0.3,
            }}
          >
            ❄
          </div>
        ))}
      </div>

      {/* Orbital rings */}
      <div className="sync-orbital-system">
        <div className="sync-orbit sync-orbit--1">
          <div className="sync-orbit-dot" />
        </div>
        <div className="sync-orbit sync-orbit--2">
          <div className="sync-orbit-dot" />
        </div>
        <div className="sync-orbit sync-orbit--3">
          <div className="sync-orbit-dot" />
        </div>
      </div>

      {/* Main content */}
      <div className="sync-overlay__content">
        {/* Central snowflake crystal */}
        <div className="sync-central-crystal">
          <div className="sync-central-glow" />
          <svg className="sync-snowflake-svg" viewBox="0 0 100 100" width="64" height="64">
            {/* Six-fold symmetry snowflake */}
            {[0, 60, 120, 180, 240, 300].map(angle => (
              <g key={angle} transform={`rotate(${angle} 50 50)`}>
                <line x1="50" y1="50" x2="50" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="50" y1="25" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="50" y1="25" x2="60" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="50" y1="35" x2="43" y2="30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="50" y1="35" x2="57" y2="30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            ))}
            <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.6" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="sync-overlay__title">
          Syncing from Snowflake
        </h1>

        {/* Stage text */}
        <div className="sync-overlay__stage" key={stageIndex}>
          <span className="sync-overlay__stage-icon">{STAGES[stageIndex].icon}</span>
          <span className="sync-overlay__stage-text">{STAGES[stageIndex].text}</span>
        </div>

        {/* Progress bar */}
        <div className="sync-overlay__progress-track">
          <div
            className="sync-overlay__progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="sync-overlay__progress-glow"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Dots indicator */}
        <div className="sync-overlay__dots">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`sync-overlay__dot ${i <= stageIndex ? 'sync-overlay__dot--active' : ''} ${i === stageIndex ? 'sync-overlay__dot--current' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
