/**
 * DataContext — Global state & high-performance memory cache for loaded EOM data.
 *
 * Auto-scopes branches based on the user's AD group-resolved permissions.
 * Branch_access users only see their own branch(es).
 * BU_access users see their own branch(es).
 * Full_access users see all branches.
 *
 * Provides instant 0ms tab switching memory cache & background sync capabilities.
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
  dataSource: 'snowflake' | 'excel' | '';
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
  getTabCache: (type: string, key: string) => any;
  setTabCache: (type: string, key: string, data: any) => void;
  clearTabCaches: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { role, branchNames } = useAuth();
  const autoScopedRef = useRef(false);
  const tabCacheRef = useRef<Map<string, Map<string, any>>>(new Map());

  // Determine allowed branches based on role
  const allowedBranches = role === 'full_access' ? null : (branchNames.length > 0 ? branchNames : []);

  const [state, setState] = useState<DataState>({
    loaded: false,
    loading: true,
    syncing: false,
    dataSource: '',
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

  const getTabCache = useCallback((type: string, key: string) => {
    const typeMap = tabCacheRef.current.get(type);
    return typeMap ? typeMap.get(key) : undefined;
  }, []);

  const setTabCache = useCallback((type: string, key: string, data: any) => {
    if (!tabCacheRef.current.has(type)) {
      tabCacheRef.current.set(type, new Map());
    }
    tabCacheRef.current.get(type)!.set(key, data);
  }, []);

  const clearTabCaches = useCallback(() => {
    tabCacheRef.current.clear();
  }, []);

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
    clearTabCaches();
    try {
      const result = await uploadFiles(files);
      if (result.success) {
        const dash = await getDashboard();
        setState(prev => ({
          ...prev,
          loaded: true,
          loading: false,
          dataSource: 'excel',
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
  }, [clearTabCaches]);

  const handleSyncSnowflake = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true, loading: true, error: '' }));
    clearTabCaches();
    try {
      await syncSnowflake();
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        loaded: true,
        loading: false,
        syncing: false,
        dataSource: 'snowflake',
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
  }, [state.globalFlags, state.globalBranches, state.globalDepartments, clearTabCaches]);

  const refreshDashboard = useCallback(async () => {
    try {
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        dashboard: dash,
        dataSource: (dash.data_source as any) || prev.dataSource,
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
      clearTabCaches(); // Refresh tab caches silently in background
      setState(prev => ({
        ...prev,
        dashboard: dash,
        dataSource: 'snowflake',
        operators: dash.operators,
        branch: dash.branch || prev.branch,
        period: dash.period || prev.period,
        availableBranches: dash.available_branches || prev.availableBranches,
        availableDepartments: dash.available_departments || prev.availableDepartments,
      }));
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments, clearTabCaches]);

  useEffect(() => {
    // Only auto-sync Snowflake in the background if the user is in live Snowflake mode
    if (!state.loaded || state.dataSource !== 'snowflake') return;
    const interval = setInterval(() => {
      handleSyncSnowflakeBackground();
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, [state.loaded, state.dataSource, handleSyncSnowflakeBackground]);

  const checkStatus = useCallback(async () => {
    try {
      const status: StatusResponse = await getStatus();
      if (status.loaded) {
        const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
        setState(prev => ({
          ...prev,
          loaded: true,
          loading: false,
          dataSource: (status.data_source as any) || (dash.data_source as any) || '',
          branch: status.branch,
          period: status.period,
          operators: dash.operators,
          dashboard: dash,
          availableBranches: status.available_branches || dash.available_branches || [],
          availableDepartments: status.available_departments || dash.available_departments || [],
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message || 'Server check failed' }));
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <DataContext.Provider
      value={{
        ...state,
        handleUpload,
        handleSyncSnowflake,
        refreshDashboard,
        checkStatus,
        setGlobalFlags,
        setGlobalBranches,
        setGlobalDepartments,
        allowedBranches,
        getTabCache,
        setTabCache,
        clearTabCaches,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
