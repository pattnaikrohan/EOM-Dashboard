/**
 * MSAL Configuration for Microsoft Entra ID (Azure AD) Authentication.
 *
 * Reads Client ID and Tenant ID from environment variables.
 * Placeholder values are used until the admin provides real credentials.
 */
import type { Configuration } from '@azure/msal-browser';
import { LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID';
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'PLACEHOLDER_TENANT_ID';

/**
 * Determine the redirect URI based on the current environment.
 * In production it uses the deployed static web app URL;
 * in development it falls back to localhost:5173.
 */
const redirectUri = window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            // console.info(message);
            break;
          case LogLevel.Verbose:
            // console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes requested during login.
 * - openid / profile / email: standard OIDC claims
 * - User.Read: read the signed-in user's basic profile from MS Graph
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
