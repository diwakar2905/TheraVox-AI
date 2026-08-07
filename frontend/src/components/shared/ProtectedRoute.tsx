/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 *
 * During the initial rehydration (isLoading = true) it renders a full-screen
 * spinner so the page doesn't flash to /login for users with a valid session.
 * Once loading finishes:
 *   - Authenticated  → render children
 *   - Not authenticated → <Navigate to="/login" state={{ from: location }} />
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg)',
        }}
      >
        <div className="auth-spinner" aria-label="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
