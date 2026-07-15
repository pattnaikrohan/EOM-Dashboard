/**
 * ProtectedRoute — Renders children only if the user is authenticated.
 * Shows a loading spinner while MSAL resolves auth state,
 * and redirects to /login if unauthenticated.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useMsal } from '@azure/msal-react';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { inProgress } = useMsal();
  const location = useLocation();

  if (inProgress !== 'none') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <Loader2 className="spinner" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
