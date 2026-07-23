/**
 * SnowflakeSyncOverlay — Full-page cinematic animation shown during Snowflake sync.
 * Features: animated snowflake logo, data stream particles, staged progress text,
 * and a smooth reveal transition when loading completes.
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
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visible, stageIndex, onComplete]);

  if (!visible && !exiting) return null;

  const progress = Math.min(((stageIndex + 1) / STAGES.length) * 100, 100);

  return (
    <div className={`sync-overlay ${exiting ? 'sync-overlay--exit' : ''}`}>
      {/* Animated background particles */}
      <div className="sync-overlay__particles">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="sync-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              opacity: 0.3 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* Data stream lines */}
      <div className="sync-overlay__streams">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="sync-stream"
            style={{
              left: `${10 + i * 12}%`,
              animationDelay: `${i * 0.4}s`,
              opacity: 0.08 + (i % 3) * 0.04,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="sync-overlay__content">
        {/* Snowflake icon with pulse rings */}
        <div className="sync-overlay__icon-container">
          <div className="sync-overlay__ring sync-overlay__ring--1" />
          <div className="sync-overlay__ring sync-overlay__ring--2" />
          <div className="sync-overlay__ring sync-overlay__ring--3" />
          <div className="sync-overlay__snowflake">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
              {/* Snowflake branches */}
              <line x1="12" y1="2" x2="9" y2="5" />
              <line x1="12" y1="2" x2="15" y2="5" />
              <line x1="12" y1="22" x2="9" y2="19" />
              <line x1="12" y1="22" x2="15" y2="19" />
              <line x1="2" y1="12" x2="5" y2="9" />
              <line x1="2" y1="12" x2="5" y2="15" />
              <line x1="22" y1="12" x2="19" y2="9" />
              <line x1="22" y1="12" x2="19" y2="15" />
            </svg>
          </div>
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
              className={`sync-overlay__dot ${i <= stageIndex ? 'sync-overlay__dot--active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
