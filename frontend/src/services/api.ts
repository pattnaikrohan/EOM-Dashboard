/**
 * API Service — Axios client for the Flask backend.
 *
 * Automatically attaches Azure AD Bearer token and auth headers to every request.
 */
import axios from 'axios';
import { API_BASE } from '../utils/constants';
import { msalInstance } from '../auth/AuthProvider';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

// ── Auth Interceptor ──────────────────────────────────────────────────────────
// Attaches the Azure AD ID token and role metadata to every API request.
api.interceptors.request.use(async (config) => {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];

      // Acquire token silently (from cache or refresh)
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        account,
      });

      if (tokenResponse?.idToken) {
        config.headers.Authorization = `Bearer ${tokenResponse.idToken}`;
        config.headers['X-Auth-Source'] = 'azure-ad';
      }

      // Fallback headers (used if backend token doesn't contain groups)
      const storedRole = localStorage.getItem('eom_resolved_role');
      if (storedRole) {
        try {
          const resolved = JSON.parse(storedRole);
          config.headers['X-User-Role'] = resolved.role || '';
          config.headers['X-User-Branches'] = (resolved.branchNames || []).join(',');
          config.headers['X-User-BU'] = (resolved.businessUnits || []).join(',');
        } catch { /* ignore parse errors */ }
      }
    }
  } catch (err) {
    // Silent failure — let the request go without auth headers
    // The backend will return 401 and the frontend will redirect to login
    console.warn('[API] Failed to acquire token for request:', err);
  }

  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AccrualLine {
  charge_code: string;
  os_cur: string;
  os_amount: number;
  ex_rate: number;
  cost_local: number;
  creditor: string;
  has_acr: string;
  acr_recognised: string;
  age_days: number;
}

export interface Job {
  job_number: string;
  job_status: string;
  branch: string;
  department: string;
  open_date: string;
  operator: string;
  sales_rep: string;
  local_charges: string;
  overseas_agent: string;
  local_client: string;
  revenue: number;
  wip: number;
  cost: number;
  accrual: number;
  profit_loss: number;
  margin_pct: number;
  job_age_days: number;
  flags: string[];
  primary_flag: string;
  is_export: boolean;
  etd?: string;
  eta?: string;
  direction?: string;
  ops_section?: string;
  accrual_lines?: AccrualLine[];
}

export interface KPI {
  total_jobs: number;
  visible_jobs?: number;
  export_jobs: number;
  import_jobs: number;
  cross_trade_jobs: number;
  no_revenue: number;
  has_wip: number;
  negative_profit: number;
  loss_jobs: number;
  margin_below_5: number;
  jfc_jobs: number;
  zero_rev_3m: number;
  jfc_opportunity: number;
  cmp_opportunity: number;
  accrual_check: number;
  clean_jobs: number;
  total_revenue: number;
  total_wip: number;
  total_cost: number;
  total_profit: number;
}

export interface OperatorSummary {
  code: string;
  branch: string;
  total_jobs: number;
  visible_jobs?: number;
  export_jobs: number;
  import_jobs: number;
  loss_count: number;
  wip_count: number;
  margin_count: number;
  zero_rev_count: number;
  clean_count: number;
  total_revenue: number;
  total_profit: number;
}

export interface DashboardData {
  branch: string;
  period: string;
  kpi: KPI;
  operators: OperatorSummary[];
  flag_distribution: Record<string, number>;
  available_branches: string[];
  available_departments: string[];
}

export interface OperatorDetail {
  operator: string;
  branch: string;
  period: string;
  kpi: KPI;
  jobs_by_flag: Record<string, Job[]>;
  flag_distribution: Record<string, number>;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  branch: string;
  period: string;
  total_jobs: number;
  operators: string[];
}

export interface StatusResponse {
  loaded: boolean;
  branch: string;
  period: string;
  total_jobs: number;
  operators: string[];
  available_branches: string[];
  available_departments: string[];
}

export interface LegendItem {
  flag: string;
  colour: string;
  hex_code: string;
  rule: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────
export const uploadFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const syncSnowflake = async () => {
  const response = await api.post('/sync', {}, { timeout: 120000 });
  return response.data;
};

export async function getDashboard(flags?: string[], branches?: string[], departments?: string[]): Promise<DashboardData> {
  const params: Record<string, string> = {};
  if (flags && flags.length > 0) params.flags = flags.join(',');
  if (branches && branches.length > 0) params.branches = branches.join(',');
  if (departments && departments.length > 0) params.departments = departments.join(',');
  const { data } = await api.get('/dashboard', { params });
  return data;
}

export async function getOperators(): Promise<{ operators: OperatorSummary[]; branch: string; period: string }> {
  const { data } = await api.get('/operators');
  return data;
}

export async function getOperatorDetail(code: string, flags?: string[], branches?: string[], departments?: string[]): Promise<OperatorDetail> {
  const params: Record<string, string> = {};
  if (flags && flags.length > 0) params.flags = flags.join(',');
  if (branches && branches.length > 0) params.branches = branches.join(',');
  if (departments && departments.length > 0) params.departments = departments.join(',');
  const { data } = await api.get(`/operator/${code}`, { params });
  return data;
}

export async function getJobs(params: Record<string, string>): Promise<{ total: number; jobs: Job[] }> {
  const { data } = await api.get('/jobs', { params });
  return data;
}

export async function getOpsReview(flags?: string[], branches?: string[], departments?: string[]): Promise<{ branch: string; period: string; sections: Record<string, Job[]>; total: number; kpi: KPI }> {
  const params: Record<string, string> = {};
  if (flags && flags.length > 0) params.flags = flags.join(',');
  if (branches && branches.length > 0) params.branches = branches.join(',');
  if (departments && departments.length > 0) params.departments = departments.join(',');
  const { data } = await api.get('/ops-review', { params });
  return data;
}

export interface SyncProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  stage: string;
  percent: number;
  current: number;
  total: number;
  message?: string;
}

export async function getSyncProgress(): Promise<SyncProgress> {
  const { data } = await api.get('/sync/progress');
  return data;
}

export async function getStatus(): Promise<StatusResponse> {
  const { data } = await api.get('/status');
  return data;
}

export async function getLegend(): Promise<{ legend: LegendItem[] }> {
  const { data } = await api.get('/legend');
  return data;
}

// ── Negative Movement Types & API ─────────────────────────────────────────────

export interface NegMovementJob {
  job_number: string;
  job_local_ref: string;
  branch: string;
  department: string;
  status: string;
  transport: string;
  container: string;
  sales_rep: string;
  local_client: string;
  origin: string;
  destination: string;
  etd: string;
  eta: string;
  job_profit: number;
  revenue: number;
  wip: number;
  cost: number;
  accrual: number;
  section: string;
  comment: string;
  category: string;
  notes_ho: string;
  resolution_status: string;
  assigned_to: string;
  updated_at: string;
  created_at: string;
}

export interface NegMovementSectionSummary {
  count: number;
  total_profit: number;
  total_revenue: number;
  total_cost: number;
  pending: number;
  responded: number;
  reviewed: number;
  closed: number;
  overdue: number;
}

export interface NegMovementSummary {
  negative_movement: NegMovementSectionSummary;
  excess_profit: NegMovementSectionSummary;
  jobs_with_losses: NegMovementSectionSummary;
  overdue_count: number;
  total_jobs: number;
}

export interface NegMovementSummaryResponse {
  branch: string;
  period: string;
  summary: NegMovementSummary;
  pl_categories: string[];
}

export async function uploadNegMovementFiles(files: File[]): Promise<any> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const { data } = await api.post('/neg-movement/upload', formData);
  return data;
}

export async function getNegMovementSummary(): Promise<NegMovementSummaryResponse> {
  const { data } = await api.get('/neg-movement/summary');
  return data;
}

export async function getNegMovementJobs(section?: string, status?: string, branch?: string): Promise<{ total: number; jobs: NegMovementJob[] }> {
  const params: Record<string, string> = {};
  if (section) params.section = section;
  if (status) params.status = status;
  if (branch) params.branch = branch;
  const { data } = await api.get('/neg-movement/jobs', { params });
  return data;
}

export async function updateNegMovementComment(
  jobNumber: string,
  body: { section: string; comment?: string; category?: string; notes_ho?: string; resolution_status?: string }
): Promise<{ success: boolean; job: NegMovementJob }> {
  const { data } = await api.put(`/neg-movement/comment/${jobNumber}`, body);
  return data;
}

export async function getNegMovementStatus(): Promise<{ loaded: boolean; branch: string; period: string; pl_categories: string[] }> {
  const { data } = await api.get('/neg-movement/status');
  return data;
}

export async function clearNegMovementData(): Promise<any> {
  const { data } = await api.post('/neg-movement/clear');
  return data;
}

export async function clearData(): Promise<any> {
  const { data } = await api.post('/clear');
  return data;
}

export async function updatePlCategories(categories: string[]): Promise<any> {
  const { data } = await api.put('/neg-movement/pl-categories', { categories });
  return data;
}

export default api;
