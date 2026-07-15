import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthProvider, { msalInstance } from './auth/AuthProvider'
import App from './App'
import { EventType, type AuthenticationResult } from '@azure/msal-browser';

msalInstance.initialize().then(() => {
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

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
});
