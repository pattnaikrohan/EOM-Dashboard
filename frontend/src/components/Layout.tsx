/**
 * Layout — Sidebar + Topbar shell matching incident-management design.
 */
import { useLocation, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Settings, Database, Upload,
  AlertTriangle, TrendingDown, Filter, Building, Trash2, Moon, Sun, LogOut, Users, ChevronRight, RefreshCw
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useData } from '../context/DataContext';
import { FLAG_PRIORITY, FLAG_COLOURS, API_BASE } from '../utils/constants';
import logo from '../assets/logo.png';
import SnowflakeSyncOverlay from './SnowflakeSyncOverlay';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { 
    loaded, operators, period, 
    globalFlags, setGlobalFlags,
    globalBranches, setGlobalBranches, availableBranches,
    globalDepartments, setGlobalDepartments, availableDepartments,
    syncing, handleSyncSnowflake
  } = useData();
  const { displayName, email, initials, logout, canAccessOpsManager, canUploadData, resolvedRole, role } = useAuth();
  const [filterOpen, setFilterOpen] = useState(false);
  const [branchFilterOpen, setBranchFilterOpen] = useState(false);
  const [deptFilterOpen, setDeptFilterOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
      <SnowflakeSyncOverlay visible={syncing} />
      {/* ── LEFT SIDEBAR ──────────────────────────────── */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="sidebar-toggle-btn"
          style={{
            position: 'absolute', right: '-14px', top: '40px',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 200, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          <ChevronRight size={16} color="#3b82f6" style={{ transform: isSidebarCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
        </button>

        {/* Brand */}
        <div className="sidebar__brand" style={{ justifyContent: 'center' }}>
          <img src={logo} alt="EOM Dashboard" style={{ height: '42px', objectFit: 'contain', display: isSidebarCollapsed ? 'none' : 'block' }} />
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {/* Main nav items */}
          <Link
            to="/"
            title="Dashboard"
            className={`sidebar__nav-item ${isActive('/') ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} color="#3b82f6" />
            <span style={{ flex: 1 }}>Dashboard</span>
            {loaded && (
              <span className="sidebar__nav-badge">
                {operators.reduce((sum, op) => sum + op.total_jobs, 0)}
              </span>
            )}
          </Link>

          {canAccessOpsManager && (
          <Link
            to="/ops-review"
            title="Ops Manager Review"
            className="sidebar__nav-item"
            style={{ fontWeight: isActive('/ops-review') ? 700 : 500, color: isActive('/ops-review') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
          >
            <AlertTriangle size={18} color="#f59e0b" />
            <span>Ops Manager</span>
          </Link>
          )}

          <Link
            to="/negative-movement"
            title="Negative Movement"
            className="sidebar__nav-item"
            style={{ fontWeight: isActive('/negative-movement') ? 700 : 500, color: isActive('/negative-movement') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
          >
            <TrendingDown size={18} color="#ef4444" />
            <span>Neg. Movement</span>
          </Link>

          <Link
            to="/operators"
            title="Operators"
            className={`sidebar__nav-item ${isActive('/operators') ? 'active' : ''}`}
            style={{ fontWeight: isActive('/operators') ? 700 : 500, color: isActive('/operators') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
          >
            <Users size={18} color="#8b5cf6" />
            <span>Operators</span>
          </Link>

          {/* Bottom nav */}
          <div style={{ marginTop: 'auto' }}>
            {canUploadData && (
            <Link
              to="/upload"
              title="Upload Data"
              className="sidebar__nav-item"
              style={{ fontWeight: isActive('/upload') ? 700 : 500, color: isActive('/upload') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
            >
              <Upload size={18} color="#10b981" />
              <span>Upload Data</span>
            </Link>
            )}

            <Link
              to="/settings"
              title="Settings & Legend"
              className="sidebar__nav-item"
              style={{ fontWeight: isActive('/settings') ? 700 : 500, color: isActive('/settings') ? 'var(--fg-base)' : 'var(--fg-muted)', background: 'transparent' }}
            >
              <Settings size={18} color="#94a3b8" />
              <span>Settings & Legend</span>
            </Link>

            {canUploadData && (
            <button
              title="Clear Data"
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
            )}
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
                      <div className="filter-dropdown" style={{
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
                      <div className="filter-dropdown" style={{
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
                    <div className="filter-dropdown" style={{
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
              onClick={() => handleSyncSnowflake()}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                cursor: 'pointer',
                padding: '0.45rem',
                borderRadius: '10px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
              title="Live Sync from Snowflake"
            >
              <RefreshCw size={18} />
            </button>
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
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minWidth: '300px',
                  maxWidth: '360px',
                  zIndex: 50,
                  animation: 'fadeIn 0.2s ease-out forwards'
                }}>
                  {/* User identity row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #60a5fa, #818cf8)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--fg-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        cursor: 'pointer',
                        padding: '0.4rem',
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
                      <LogOut size={16} />
                    </button>
                  </div>

                  {/* Role & Permissions */}
                  {resolvedRole && (
                    <>
                      <div style={{ height: '1px', background: 'var(--border-base)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {/* Role Badge Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.12rem 0.45rem',
                            borderRadius: '5px',
                            background: role === 'full_access' ? 'rgba(34, 197, 94, 0.15)' 
                              : role === 'risk_compliance' ? 'rgba(234, 179, 8, 0.15)' 
                              : role === 'bu_access' ? 'rgba(59, 130, 246, 0.15)' 
                              : role === 'branch_access' ? 'rgba(168, 85, 247, 0.15)' 
                              : role === 'eom_elevated' ? 'rgba(6, 182, 212, 0.15)' 
                              : 'rgba(239, 68, 68, 0.15)',
                            color: role === 'full_access' ? '#22c55e' 
                              : role === 'risk_compliance' ? '#eab308' 
                              : role === 'bu_access' ? '#3b82f6' 
                              : role === 'branch_access' ? '#a855f7' 
                              : role === 'eom_elevated' ? '#06b6d4' 
                              : '#ef4444',
                            border: `1px solid ${role === 'full_access' ? 'rgba(34, 197, 94, 0.3)' 
                              : role === 'risk_compliance' ? 'rgba(234, 179, 8, 0.3)' 
                              : role === 'bu_access' ? 'rgba(59, 130, 246, 0.3)' 
                              : role === 'branch_access' ? 'rgba(168, 85, 247, 0.3)' 
                              : role === 'eom_elevated' ? 'rgba(6, 182, 212, 0.3)' 
                              : 'rgba(239, 68, 68, 0.3)'}`,
                          }}>
                            {role === 'full_access' ? 'Full Access' 
                              : role === 'risk_compliance' ? 'Risk & Compliance' 
                              : role === 'bu_access' ? 'BU Manager' 
                              : role === 'branch_access' ? 'Branch Access' 
                              : role === 'eom_elevated' ? 'EOM Elevated' 
                              : 'No Access'}
                          </span>
                          {(role === 'full_access' || role === 'risk_compliance') && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>
                              All Business Units & Branches {role === 'risk_compliance' ? '(Read-only)' : ''}
                            </span>
                          )}
                          {role === 'eom_elevated' && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--fg-muted)' }}>
                              {[
                                resolvedRole?.isSettingsAdmin && 'Settings Admin',
                                resolvedRole?.isNegMovementElevated && 'Neg Movement',
                              ].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>

                        {/* AD Groups — compact tag row */}
                        {resolvedRole.matchedGroups && resolvedRole.matchedGroups.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.62rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginRight: '2px' }}>Groups</span>
                            {resolvedRole.matchedGroups.slice(0, role === 'full_access' ? 3 : 6).map((group: string, i: number) => (
                              <span key={i} style={{
                                fontSize: '0.6rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-base)',
                                color: 'var(--fg-base)',
                                whiteSpace: 'nowrap',
                                lineHeight: '1.4'
                              }}>
                                {group}
                              </span>
                            ))}
                            {resolvedRole.matchedGroups.length > (role === 'full_access' ? 3 : 6) && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                                +{resolvedRole.matchedGroups.length - (role === 'full_access' ? 3 : 6)} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Business Units & Branches — only for non-full-access */}
                        {role !== 'full_access' && resolvedRole.businessUnits && resolvedRole.businessUnits.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.62rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginRight: '2px' }}>BU</span>
                            {resolvedRole.businessUnits.map((bu: string, i: number) => (
                              <span key={i} style={{
                                fontSize: '0.6rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                color: 'var(--fg-base)',
                                whiteSpace: 'nowrap',
                                lineHeight: '1.4'
                              }}>
                                {bu}
                              </span>
                            ))}
                          </div>
                        )}

                        {role !== 'full_access' && resolvedRole.branchNames && resolvedRole.branchNames.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.62rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginRight: '2px' }}>Branches</span>
                            {resolvedRole.branchNames.map((branch: string, i: number) => (
                              <span key={i} style={{
                                fontSize: '0.6rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'rgba(168, 85, 247, 0.08)',
                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                color: 'var(--fg-base)',
                                whiteSpace: 'nowrap',
                                lineHeight: '1.4'
                              }}>
                                {branch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
