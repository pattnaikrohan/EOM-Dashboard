/**
 * Login — Ultra-Premium Enterprise SSO Login Page for AAW EOM Review Agent.
 *
 * Viewport-locked unified dark obsidian/glassmorphic layout with glowing ambient mesh,
 * live operations telemetry summary, and pristine Microsoft Entra ID single sign-on experience.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Shield, BarChart3, TrendingUp, Zap, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login() {
  const { isAuthenticated, login } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      {/* ── Ambient Glowing Mesh & Grid Canvas ────────────────────────── */}
      <div className="login-grid-bg" />
      <div className="login-mesh login-mesh--1" />
      <div className="login-mesh login-mesh--2" />
      <div className="login-mesh login-mesh--3" />

      {/* ── Left Branding & Command Center Panel ───────────────────────── */}
      <div className="login-brand-panel">
        <div className="login-brand-panel__content">
          {/* Status Header Badge */}
          <div className="login-brand-header animate-login-element delay-100">
            <img src={logo} alt="AAW Group" className="login-brand-logo" />
          </div>

          {/* Hero Headline */}
          <div style={{ marginTop: '2rem' }}>
            <h1 className="login-brand-title animate-login-element delay-200" style={{ fontSize: '3.5rem', lineHeight: 1.1, marginBottom: '1.5rem', fontWeight: 800 }}>
              End-of-Month <br />
              <span className="login-brand-title-accent" style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'textGradientShift 4s linear infinite' }}>Dashboard</span>
            </h1>

            <p className="login-brand-subtitle animate-login-element delay-300" style={{ 
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.95rem', 
              lineHeight: 1.65, 
              color: '#cbd5e1', 
              maxWidth: '520px', 
              marginBottom: '3rem',
              fontWeight: 300,
              letterSpacing: '0.01em'
            }}>
              Enterprise command center for end-of-month financial processing, billing anomaly detection, negative movement tracking, and automated operational governance.
            </p>
          </div>

          {/* Feature Chips */}
          <div className="login-features animate-login-element delay-400" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '500px' }}>
            {[
              { icon: <BarChart3 size={16} color="#60a5fa" />, label: 'Dashboard Analytics' },
              { icon: <TrendingUp size={16} color="#34d399" />, label: 'Negative Movement Resolution' },
              { icon: <Shield size={16} color="#a78bfa" />, label: 'Automated Ops Review' },
              { icon: <Zap size={16} color="#fbbf24" />, label: 'Real-Time Anomaly Detection' },
            ].map((f, i) => (
              <div 
                className={`login-feature-chip animate-login-element`} 
                key={f.label}
                style={{
                  animationDelay: `${400 + i * 150}ms`,
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '8px' }}>
                  {f.icon}
                </div>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Login Gateway Panel ─────────────────────────────────── */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Top Laser Glow Accent Bar */}
          <div className="login-card__accent-bar" />

          <div className="login-card__inner">
            {/* Header with Glowing Shield */}
            <div className="login-card__header">
              <div className="login-card__icon-ring">
                <Shield size={26} strokeWidth={1.8} className="login-card__icon-svg" />
              </div>
              <h2 className="login-card__title">Welcome back</h2>
              <p className="login-card__desc">
                Authenticate with your AAW corporate account to access the EOM intelligence suite.
              </p>
            </div>

            {/* Microsoft Entra ID SSO Button */}
            <button
              id="sso-login-button"
              className="login-sso-btn"
              onClick={login}
              type="button"
            >
              <svg className="login-sso-btn__icon" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span className="login-sso-btn__text">Sign in with Microsoft</span>
              <ArrowRight size={17} className="login-sso-btn__arrow" />
            </button>

            {/* Enterprise Assurance Badges */}
            <div className="login-card__assurance">
              <div className="login-card__assurance-item">
                <Lock size={12} />
                <span>Single Tenant Access</span>
              </div>
              <span className="login-card__assurance-dot" />
              <div className="login-card__assurance-item">
                <CheckCircle2 size={12} />
                <span>Entra ID Protected</span>
              </div>
              <span className="login-card__assurance-dot" />
              <div className="login-card__assurance-item">
                <Zap size={12} />
                <span>256-Bit SSL</span>
              </div>
            </div>
          </div>

          {/* Footer Assistance */}
          <div className="login-card__footer">
            <span>Having trouble verifying credentials? </span>
            <a href="mailto:it@aaw.com.au?subject=EOM%20Dashboard%20Login%20Assistance" className="login-card__link">
              Contact IT Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
