/**
 * Layout — Sidebar + Topbar shell matching incident-management design.
 */
import { useLocation, Link } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Upload, Settings, ChevronRight,
  AlertTriangle, TrendingDown, Filter, ChevronDown, Building, Trash2, Moon, Sun, LogOut
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useData } from '../context/DataContext';
import { FLAG_PRIORITY, FLAG_COLOURS, API_BASE } from '../utils/constants';
import logo from '../assets/logo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { 
    loaded, operators, period, 
    globalFlags, setGlobalFlags,
    globalBranches, setGlobalBranches, availableBranches,
    globalDepartments, setGlobalDepartments, availableDepartments
  } = useData();
  const { displayName, email, initials, logout } = useAuth();
  const [filterOpen, setFilterOpen] = useState(false);
  const [branchFilterOpen, setBranchFilterOpen] = useState(false);
  const [deptFilterOpen, setDeptFilterOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const filterRef = useRef<HTMLDivElement>(null);
  const branchFilterRef = useRef<HTMLDivElement>(null);
  const deptFilterRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const operatorsByBranch = useMemo(() => {
    const grouped: Record<string, typeof operators> = {};
    for (const op of operators) {
      const b = (op as any).branch || 'ALL';
      if (!grouped[b]) grouped[b] = [];
      grouped[b].push(op);
    }
    return grouped;
  }, [operators]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
      if (branchFilterRef.current && !branchFilterRef.current.contains(event.target as Node)) {
        setBranchFilterOpen(false);
      }
      if (deptFilterRef.current && !deptFilterRef.current.contains(event.target as Node)) {
        setDeptFilterOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFlag = (flag: string) => {
    if (globalFlags.includes(flag)) {
      setGlobalFlags(globalFlags.filter(f => f !== flag));
    } else {
      setGlobalFlags([...globalFlags, flag]);
    }
  };

  const toggleBranch = (b: string) => {
    if (globalBranches.includes(b)) {
      setGlobalBranches(globalBranches.filter(x => x !== b));
    } else {
      setGlobalBranches([...globalBranches, b]);
    }
  };

  const toggleDepartment = (d: string) => {
    if (globalDepartments.includes(d)) {
      setGlobalDepartments(globalDepartments.filter(x => x !== d));
    } else {
      setGlobalDepartments([...globalDepartments, d]);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isOperatorActive = (code: string) => {
    return location.pathname === `/operator/${code}`;
  };

  return (
    <div className="app-layout">
      {/* ── LEFT SIDEBAR ──────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand" style={{ justifyContent: 'center' }}>
          <img src={logo} alt="EOM Dashboard" style={{ height: '42px', objectFit: 'contain' }} />
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {/* Main nav items */}
          <Link
            to="/"
            className={`sidebar__nav-item ${isActive('/') && !isActive('/operator') && !isActive('/ops-review') && !isActive('/negative-movement') && !isActive('/upload') && !isActive('/settings') ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} color="#3b82f6" />
            <span style={{ flex: 1 }}>Dashboard</span>
            {loaded && (
              <span className="sidebar__nav-badge">
                {operators.reduce((sum, op) => sum + op.total_jobs, 0)}
              </span>
            )}
          </Link>

          <Link
            to="/ops-review"
            className="sidebar__nav-item"
            style={{ fontWeight: isActive('/ops-review') ? 700 : 500, color: isActive('/ops-review') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
          >
            <AlertTriangle size={18} color="#f59e0b" />
            <span>Ops Manager</span>
          </Link>

          <Link
            to="/negative-movement"
            className="sidebar__nav-item"
            style={{ fontWeight: isActive('/negative-movement') ? 700 : 500, color: isActive('/negative-movement') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
          >
            <TrendingDown size={18} color="#ef4444" />
            <span>Neg. Movement</span>
          </Link>

          {/* Operator list */}
          {loaded && operators.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem' }}>
              <div className="sidebar__section-label">OPERATORS BY BRANCH</div>
              {Object.entries(operatorsByBranch).map(([branchName, branchOps]) => (
                <BranchSection 
                  key={branchName} 
                  branchName={branchName} 
                  operators={branchOps} 
                  isOperatorActive={isOperatorActive} 
                />
              ))}
            </div>
          )}

          {/* Bottom nav */}
          <div style={{ marginTop: 'auto' }}>
            <Link
              to="/upload"
              className="sidebar__nav-item"
              style={{ fontWeight: isActive('/upload') ? 700 : 500, color: isActive('/upload') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
            >
              <Upload size={18} color="#10b981" />
              <span>Upload Data</span>
            </Link>

            <Link
              to="/settings"
              className="sidebar__nav-item"
              style={{ fontWeight: isActive('/settings') ? 700 : 500, color: isActive('/settings') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
            >
              <Settings size={18} color="#94a3b8" />
              <span>Settings & Legend</span>
            </Link>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently clear all loaded data? This cannot be undone.")) {
                  fetch(`${API_BASE}/clear`, { method: 'POST' })
                    .then(() => window.location.href = '/')
                    .catch(e => alert("Failed to clear data: " + e));
                }
              }}
              className="sidebar__nav-item"
              style={{ width: 'calc(100% - 1.2rem)', color: '#ef4444', marginTop: '0.5rem', textAlign: 'left' }}
            >
              <Trash2 size={18} color="#ef4444" />
              <span>Clear Data</span>
            </button>
          </div>
        </nav>

        {/* User Profile & Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__footer-text">
            {period || 'No Data Loaded'}
          </div>
          <div className="sidebar__user-profile">
            <div className="sidebar__user-avatar" title={displayName}>
              {initials}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{displayName}</span>
              <span className="sidebar__user-email">{email}</span>
            </div>
            <button
              className="sidebar__signout-btn"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar__left">
            <h1 className="topbar__title" style={{ margin: 0 }}>EOM Dashboard</h1>
          </div>
          <div className="topbar__right">
            {loaded && (
              <div style={{ display: 'flex', gap: '10px', marginRight: '1rem' }}>
                
                {/* Branch Filters */}
                {availableBranches && availableBranches.length > 0 && (
                  <div className="topbar__filter-container" ref={branchFilterRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setBranchFilterOpen(!branchFilterOpen)}
                      style={{
                        background: globalBranches.length > 0 ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#F5F3EC',
                        color: globalBranches.length > 0 ? '#ffffff' : '#475569',
                        border: globalBranches.length > 0 ? '1px solid transparent' : '1px solid #EAE5DE',
                        padding: '0.45rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: globalBranches.length > 0 ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none'
                      }}
                    >
                      <Building size={15} />
                      {globalBranches.length > 0 ? `${globalBranches.length} Branches` : 'Branches'}
                    </button>
                    {branchFilterOpen && (
                      <div style={{
                        position: 'absolute', top: '120%', right: 0, background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)', borderRadius: '14px', boxShadow: '0 15px 50px rgba(0, 105, 148, 0.15)',
                        padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        minWidth: '200px', zIndex: 1000, border: '1px solid rgba(14, 165, 233, 0.1)'
                      }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.3rem', paddingLeft: '0.3rem', letterSpacing: '0.05em' }}>SELECT BRANCHES</div>
                        {availableBranches && availableBranches.map(b => {
                          const isActive = globalBranches.includes(b);
                          const color = '#3b82f6';
                          return (
                            <button
                              key={b} onClick={() => toggleBranch(b)}
                              style={{
                                background: isActive ? `${color}15` : 'transparent', color: isActive ? color : '#334155',
                                border: '1px solid transparent', borderColor: isActive ? `${color}40` : 'transparent',
                                padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                                transition: 'all 0.15s', width: '100%',
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{
                                width: 16, height: 16, borderRadius: '5px', border: `2px solid ${color}`,
                                background: isActive ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.2s'
                              }}>
                                {isActive && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '2px' }} />}
                              </div>
                              {b}
                            </button>
                          );
                        })}
                        {globalBranches.length > 0 && (
                          <button
                            onClick={() => { setGlobalBranches([]); setBranchFilterOpen(false); }}
                            style={{
                              marginTop: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                              border: 'none', padding: '0.6rem', borderRadius: '8px', fontSize: '0.75rem',
                              fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          >
                            Clear Branches
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Department Filters */}
                {availableDepartments && availableDepartments.length > 0 && (
                  <div className="topbar__filter-container" ref={deptFilterRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setDeptFilterOpen(!deptFilterOpen)}
                      style={{
                        background: globalDepartments.length > 0 ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#F5F3EC',
                        color: globalDepartments.length > 0 ? '#ffffff' : '#475569',
                        border: globalDepartments.length > 0 ? '1px solid transparent' : '1px solid #EAE5DE',
                        padding: '0.45rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: globalDepartments.length > 0 ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none'
                      }}
                    >
                      <LayoutDashboard size={15} />
                      {globalDepartments.length > 0 ? `${globalDepartments.length} Depts` : 'Departments'}
                    </button>
                    {deptFilterOpen && (
                      <div style={{
                        position: 'absolute', top: '120%', right: 0, background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)', borderRadius: '14px', boxShadow: '0 15px 50px rgba(0, 105, 148, 0.15)',
                        padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        minWidth: '200px', zIndex: 1000, border: '1px solid rgba(14, 165, 233, 0.1)'
                      }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.3rem', paddingLeft: '0.3rem', letterSpacing: '0.05em' }}>SELECT DEPARTMENTS</div>
                        {availableDepartments && availableDepartments.map(d => {
                          const isActive = globalDepartments.includes(d);
                          const color = '#8b5cf6';
                          return (
                            <button
                              key={d} onClick={() => toggleDepartment(d)}
                              style={{
                                background: isActive ? `${color}15` : 'transparent', color: isActive ? color : '#334155',
                                border: '1px solid transparent', borderColor: isActive ? `${color}40` : 'transparent',
                                padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                                transition: 'all 0.15s', width: '100%',
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{
                                width: 16, height: 16, borderRadius: '5px', border: `2px solid ${color}`,
                                background: isActive ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.2s'
                              }}>
                                {isActive && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '2px' }} />}
                              </div>
                              {d}
                            </button>
                          );
                        })}
                        {globalDepartments.length > 0 && (
                          <button
                            onClick={() => { setGlobalDepartments([]); setDeptFilterOpen(false); }}
                            style={{
                              marginTop: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                              border: 'none', padding: '0.6rem', borderRadius: '8px', fontSize: '0.75rem',
                              fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          >
                            Clear Departments
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Flag Filters */}
                <div className="topbar__filter-container" ref={filterRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    style={{
                      background: globalFlags.length > 0 ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#F5F3EC',
                      color: globalFlags.length > 0 ? '#ffffff' : '#475569',
                      border: globalFlags.length > 0 ? '1px solid transparent' : '1px solid #EAE5DE',
                      padding: '0.45rem 1rem',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: globalFlags.length > 0 ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none'
                    }}
                  >
                    <Filter size={15} />
                    {globalFlags.length > 0 ? `${globalFlags.length} Flags` : 'Flags'}
                  </button>

                  {filterOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '120%',
                      right: 0,
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      borderRadius: '14px',
                      boxShadow: '0 15px 50px rgba(0, 105, 148, 0.15)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      minWidth: '240px',
                      zIndex: 1000,
                      border: '1px solid rgba(14, 165, 233, 0.1)'
                    }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.3rem', paddingLeft: '0.3rem', letterSpacing: '0.05em' }}>SELECT FLAGS</div>
                      {FLAG_PRIORITY.map(flag => {
                        const isActive = globalFlags.includes(flag);
                        const color = FLAG_COLOURS[flag]?.hex || '#ccc';
                        return (
                          <button
                            key={flag}
                            onClick={() => toggleFlag(flag)}
                            style={{
                              background: isActive ? `${color}15` : 'transparent',
                              color: isActive ? color : '#334155',
                              border: '1px solid transparent',
                              borderColor: isActive ? `${color}40` : 'transparent',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              textAlign: 'left',
                              transition: 'all 0.15s',
                              width: '100%',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{
                              width: 16,
                              height: 16,
                              borderRadius: '5px',
                              border: `2px solid ${color}`,
                              background: isActive ? color : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.2s'
                            }}>
                              {isActive && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '2px' }} />}
                            </div>
                            {flag === 'CLEAN' ? 'ALL CLEAN' : flag}
                          </button>
                        );
                      })}
                      {globalFlags.length > 0 && (
                        <button
                          onClick={() => { setGlobalFlags([]); setFilterOpen(false); }}
                          style={{
                            marginTop: '0.6rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: 'none',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                          Clear Flags
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer',
                padding: '0.45rem',
                borderRadius: '10px',
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={18} color="#f8fafc" /> : <Sun size={18} color="#fbbf24" />}
            </button>
            <div className="topbar__avatar-wrapper" style={{ position: 'relative' }} ref={accountMenuRef}>
              <div 
                className="topbar__avatar" 
                title={displayName}
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                style={{ cursor: 'pointer' }}
              >
                {initials}
              </div>

              {accountMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-base)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  minWidth: '320px',
                  zIndex: 50,
                  animation: 'fadeIn 0.2s ease-out forwards'
                }}>
                  <div style={{ 
                    width: '42px', height: '42px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #60a5fa, #818cf8)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

function BranchSection({ branchName, operators, isOperatorActive }: { branchName: string, operators: any[], isOperatorActive: (code: string) => boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  const totalJobs = operators.reduce((sum, op) => sum + op.total_jobs, 0);

  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', width: 'calc(100% - 1rem)', padding: '0.35rem 0.5rem',
          margin: '0 0.5rem', borderRadius: '8px',
          background: 'transparent', 
          border: 'none', cursor: 'pointer', 
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, textAlign: 'left' }}>
          <div style={{ 
            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: isOpen ? '#3b82f6' : 'rgba(0,0,0,0.04)', borderRadius: '6px', transition: 'all 0.2s' 
          }}>
            <Building size={12} color={isOpen ? '#ffffff' : '#64748b'} />
          </div>
          <span style={{ color: isOpen ? '#0f172a' : '#475569', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.02em' }}>
            {branchName}
          </span>
          <span style={{ 
            color: '#64748b', fontSize: '0.65rem', fontWeight: 600, marginLeft: 'auto',
            background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '10px'
          }}>
            {totalJobs}
          </span>
        </div>
        <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
          {isOpen ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
        </div>
      </button>

      {isOpen && (
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '2px', 
          margin: '0.25rem 0.5rem 0.5rem 1.2rem',
          position: 'relative'
        }}>
          {/* Subtle tree line */}
          <div style={{ position: 'absolute', left: '0', top: '0', bottom: '10px', width: '1px', background: 'rgba(0,0,0,0.06)' }} />
          
          {operators.map(op => {
            const active = isOperatorActive(op.code);
            return (
              <Link
                key={op.code}
                to={`/operator/${op.code}`}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.35rem 0.75rem',
                  marginLeft: '0.5rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#1d4ed8' : '#475569',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.75rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if(!active) { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; e.currentTarget.style.color = '#0f172a'; } }}
                onMouseLeave={e => { if(!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
              >
                {/* Active indicator line */}
                {active && <div style={{ position: 'absolute', left: '-0.5rem', top: '20%', bottom: '20%', width: '2px', background: '#3b82f6', borderRadius: '2px' }} />}
                
                <span>{op.code}</span>
                <span style={{
                  background: active ? '#bfdbfe' : '#f1f5f9',
                  color: active ? '#1e40af' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  fontWeight: 600
                }}>
                  {op.total_jobs}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
