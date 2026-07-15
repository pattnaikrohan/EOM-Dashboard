/**
 * DataContext — Global state for loaded EOM data.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DashboardData, OperatorSummary, StatusResponse } from '../services/api';
import { uploadFiles, syncSnowflake, getDashboard, getStatus } from '../services/api';

interface DataState {
  loaded: boolean;
  loading: boolean;
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
}

interface DataContextType extends DataState {
  handleUpload: (files: File[]) => Promise<void>;
  handleSyncSnowflake: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  checkStatus: () => Promise<void>;
  setGlobalFlags: (flags: string[]) => void;
  setGlobalBranches: (branches: string[]) => void;
  setGlobalDepartments: (departments: string[]) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    loaded: false,
    loading: false,
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
  });

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
    setState(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await syncSnowflake();
      const dash = await getDashboard(state.globalFlags, state.globalBranches, state.globalDepartments);
      setState(prev => ({
        ...prev,
        loading: false,
        dashboard: dash,
        operators: dash.operators,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
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

  useEffect(() => {
    if (state.loaded) {
      refreshDashboard();
    }
  }, [state.globalFlags, state.globalBranches, state.globalDepartments, refreshDashboard]);

  const checkStatus = useCallback(async () => {
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
      }
    } catch { /* silent */ }
  }, []);

  return (
    <DataContext.Provider value={{ 
      ...state, 
      handleUpload, handleSyncSnowflake, refreshDashboard, checkStatus, 
      setGlobalFlags, setGlobalBranches, setGlobalDepartments 
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
