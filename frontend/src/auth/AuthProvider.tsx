/**
 * AuthProvider — Initializes MSAL and wraps the React tree with MsalProvider.
 *
 * Also exposes a lightweight `useAuth()` hook for convenience so components
 * can easily access the active account, login, and logout helpers.
 */
import { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  PublicClientApplication,
  EventType,
  type AccountInfo,
  type AuthenticationResult,
} from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest } from './authConfig';

// ── MSAL Instance (singleton) ─────────────────────────────────────────────────
const msalInstance = new PublicClientApplication(msalConfig);

// Set the first account as active if we already have one cached
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0]);
}

// Listen for successful logins and set active account
msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS &&
    (event.payload as AuthenticationResult)?.account
  ) {
    msalInstance.setActiveAccount(
      (event.payload as AuthenticationResult).account
    );
  }
});

// ── Auth Context ──────────────────────────────────────────────────────────────
interface AuthContextType {
  isAuthenticated: boolean;
  account: AccountInfo | null;
  displayName: string;
  email: string;
  initials: string;
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

  const login = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error('Login failed:', e);
    }
  }, [instance]);

  const logout = useCallback(async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }, [instance]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      account,
      displayName,
      email,
      initials,
      login,
      logout,
    }),
    [isAuthenticated, account, displayName, email, initials, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Public Hook ───────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ── Root Provider ─────────────────────────────────────────────────────────────
export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </MsalProvider>
  );
}
