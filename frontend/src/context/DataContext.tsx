/**
 * DataContext — Global state for loaded EOM data.
 *
 * Auto-scopes branches based on the user's AD group-resolved permissions.
 * Branch_access users only see their own branch(es).
 * BU_access users see their own branch(es).
 * Full_access users see all branches.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { DashboardData, OperatorSummary, StatusResponse } from '../services/api';
import { uploadFiles, syncSnowflake, getDashboard, getStatus } from '../services/api';
import { useAuth } from '../auth/AuthProvider';

interface DataState {
  loaded: boolean;
  loading: boolean;
  syncing: boolean;
  branch: string;
  period: string;
  operators: OperatorSummary[];
  dashboard: DashboardData | null;
  error: string;
  globalFlags: string[];
  globalBranches: string[];
  globalDepartments: string[];
  availableBranches: string[];
  availableDepartments: string[];
  allowedBranches: string[] | null;  // null = all allowed (full_access)
}

interface DataContextType extends DataState {
  handleUpload: (files: File[]) => Promise<void>;
  handleSyncSnowflake: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  checkStatus: () => Promise<void>;
  setGlobalFlags: (flags: string[]) => void;
  setGlobalBranches: (branches: string[]) => void;
  setGlobalDepartments: (departments: string[]) => void;
  allowedBranches: string[] | null;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { role, branchNames } = useAuth();
  const autoScopedRef = useRef(false);

  // Determine allowed branches based on role
  const allowedBranches = role === 'full_access' ? null : (branchNames.length > 0 ? branchNames : []);

  const [state, setState] = useState<DataState>({
    loaded: false,
    loading: true,
    syncing: false,
    branch: '',
    period: '',
    operators: [],
    dashboard: null,
    error: '',
    globalFlags: [],
    globalBranches: [],
    globalDepartments: [],
    availableBranches: [],
    availableDepartments: [],
    allowedBranches,
  });

  // Auto-scope branches on first load when user has branch restrictions
  useEffect(() => {
    if (!autoScopedRef.current && allowedBranches && allowedBranches.length > 0) {
      setState(prev => ({ ...prev, globalBranches: allowedBranches, allowedBranches }));
      autoScopedRef.current = true;
    }
  }, [allowedBranches]);

  const setGlobalFlags = useCallback((flags: string[]) => {
    setState(prev => ({ ...prev, globalFlags: flags }));
  }, []);

  const setGlobalBranches = useCallback((branches: string[]) => {
    setState(prev => ({ ...prev, globalBranches: branches }));
  }, []);

  const setGlobalDepartments = useCallback((departments: string[]) => {
    setState(prev => ({ ...prev, globalDepartments: departments }));
  }, []);

  const handleUpload = useCallback(async (files: File[]) => {
    setState(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const result = await uploadFiles(files);
      if (result.success) {
        const dash = await getDashboard();
        setState(prev => ({
          ...prev,
          loaded: true,
          loading: false,
          branch: result.branch,
          period: result.period,
          operators: dash.operators,
          dashboard: dash,
          error: '',
          availableBranches: dash.available_branches || [],
          availableDepartments: dash.available_departments || [],
        }));
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || err.message || 'Upload failed',
      }));
    }
  }, []);

  const handleSyncSnowflake = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true, loading: true, error: '' }));
    try {
      await syncSnowflake();
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        loaded: true,
        loading: false,
        syncing: false,
        dashboard: dash,
        operators: dash.operators,
        branch: dash.branch || prev.branch,
        period: dash.period || prev.period,
        availableBranches: dash.available_branches || prev.availableBranches,
        availableDepartments: dash.available_departments || prev.availableDepartments,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        syncing: false,
        error: err.response?.data?.detail || err.message || 'Sync failed',
      }));
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments]);

  const refreshDashboard = useCallback(async () => {
    try {
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        dashboard: dash,
        operators: dash.operators,
        availableBranches: dash.available_branches || prev.availableBranches,
        availableDepartments: dash.available_departments || prev.availableDepartments,
      }));
    } catch { /* silent */ }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments]);

  const handleSyncSnowflakeBackground = useCallback(async () => {
    try {
      await syncSnowflake();
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        dashboard: dash,
        operators: dash.operators,
        branch: dash.branch || prev.branch,
        period: dash.period || prev.period,
        availableBranches: dash.available_branches || prev.availableBranches,
        availableDepartments: dash.available_departments || prev.availableDepartments,
      }));
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments]);

  useEffect(() => {
    if (!state.loaded) return;
    const interval = setInterval(() => {
      handleSyncSnowflakeBackground();
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, [state.loaded, handleSyncSnowflakeBackground]);

  useEffect(() => {
    if (state.loaded) {
      const timer = setTimeout(() => {
        refreshDashboard();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments, refreshDashboard, state.loaded]);

  const checkStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const status: StatusResponse = await getStatus();
      if (status.loaded) {
        const dash = await getDashboard();
        setState(prev => ({
          ...prev,
          loaded: true,
          loading: false,
          branch: status.branch,
          period: status.period,
          operators: dash.operators,
          dashboard: dash,
          error: '',
          availableBranches: dash.available_branches || status.available_branches || [],
          availableDepartments: dash.available_departments || status.available_departments || [],
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch { 
        setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      ...state, 
      handleUpload, handleSyncSnowflake, refreshDashboard, checkStatus, 
      setGlobalFlags, setGlobalBranches, setGlobalDepartments,
      allowedBranches,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
