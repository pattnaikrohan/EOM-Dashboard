/**
 * AuthProvider — Initializes MSAL and wraps the React tree with MsalProvider.
 *
 * Enhanced with AD group-based role resolution for the EOM Dashboard.
 * Extracts group IDs from the token or Graph API, resolves the EOM role,
 * and exposes permissions via the useAuth() hook.
 */
import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest } from './authConfig';
import {
  resolveEomRole,
  extractGroupsFromToken,
  fetchGroupsFromGraph,
  type EomResolvedRole,
} from './adGroupMapping';

// ── MSAL Instance (singleton) ─────────────────────────────────────────────────
export const msalInstance = new PublicClientApplication(msalConfig);

// ── Auth Context ──────────────────────────────────────────────────────────────
interface AuthContextType {
  isAuthenticated: boolean;
  account: AccountInfo | null;
  displayName: string;
  email: string;
  initials: string;
  // EOM role & permissions
  role: EomResolvedRole['role'] | null;
  branchNames: string[];
  businessUnits: string[];
  functionalRoles: string[];
  canAccessOpsManager: boolean;
  canUploadData: boolean;
  canEditSettings: boolean;
  isNegMovementElevated: boolean;
  isBuManager: boolean;
  resolvedRole: EomResolvedRole | null;
  roleLoading: boolean;
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const account = accounts[0] || null;
  const displayName = account?.name || 'User';
  const email = account?.username || '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  // ── Role State ─────────────────────────────────────────────────────────
  const [resolvedRole, setResolvedRole] = useState<EomResolvedRole | null>(() => {
    const stored = localStorage.getItem('eom_resolved_role');
    return stored ? JSON.parse(stored) : null;
  });
  const [roleLoading, setRoleLoading] = useState(false);

  // ── Resolve role when account changes ─────────────────────────────────
  useEffect(() => {
    if (!account || !isAuthenticated) return;

    let cancelled = false;

    async function resolveRole() {
      setRoleLoading(true);
      try {
        // 1. Try extracting groups from the ID token claims
        const idTokenClaims = account!.idTokenClaims || {};
        let groupIds = extractGroupsFromToken(idTokenClaims);
        console.log('[EOM Auth] Groups from token claims:', groupIds.length);

        // 2. If no groups in token, try Graph API
        if (groupIds.length === 0) {
          console.log('[EOM Auth] No groups in token, fetching from Graph API...');
          try {
            // Try with GroupMember.Read.All first
            const tokenResponse = await instance.acquireTokenSilent({
              scopes: ['User.Read', 'GroupMember.Read.All'],
              account: account!,
            });
            groupIds = await fetchGroupsFromGraph(tokenResponse.accessToken);
          } catch {
            // Fallback to User.Read only
            try {
              const tokenResponse = await instance.acquireTokenSilent({
                scopes: ['User.Read'],
                account: account!,
              });
              groupIds = await fetchGroupsFromGraph(tokenResponse.accessToken);
            } catch (err2) {
              console.warn('[EOM Auth] Could not acquire Graph token:', err2);
            }
          }
        }

        if (!cancelled) {
          const resolved = resolveEomRole(groupIds, account?.username, account?.name);
          console.log('[EOM Auth] Resolved role:', resolved);
          setResolvedRole(resolved);
          localStorage.setItem('eom_resolved_role', JSON.stringify(resolved));
        }
      } catch (err) {
        console.error('[EOM Auth] Role resolution failed:', err);
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    }

    resolveRole();
    return () => { cancelled = true; };
  }, [account, isAuthenticated, instance]);

  // ── Actions ────────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error('Login failed:', e);
    }
  }, [instance]);

  const logout = useCallback(async () => {
    try {
      // Clear stored role data
      localStorage.removeItem('eom_resolved_role');
      setResolvedRole(null);
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }, [instance]);

  // ── Context Value ──────────────────────────────────────────────────────
  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      account,
      displayName,
      email,
      initials,
      // EOM role & permissions
      role: resolvedRole?.role || null,
      branchNames: resolvedRole?.branchNames || [],
      businessUnits: resolvedRole?.businessUnits || [],
      functionalRoles: resolvedRole?.functionalRoles || [],
      canAccessOpsManager: resolvedRole?.canAccessOpsManager || false,
      canUploadData: resolvedRole?.canUploadData || false,
      canEditSettings: resolvedRole?.canEditSettings || false,
      isNegMovementElevated: resolvedRole?.isNegMovementElevated || false,
      isBuManager: resolvedRole?.isBuManager || false,
      resolvedRole,
      roleLoading,
      // Actions
      login,
      logout,
    }),
    [isAuthenticated, account, displayName, email, initials,
     resolvedRole, roleLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Public Hook ───────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ── Root Provider ─────────────────────────────────────────────────────────
export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </MsalProvider>
  );
}
