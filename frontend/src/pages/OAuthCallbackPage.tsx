/**
 * OAuthCallbackPage
 *
 * Landing page after a successful OAuth provider redirect.
 *
 * Flow:
 *  1. Backend set a `theravox_refresh` httpOnly cookie before redirecting here.
 *  2. AuthContext mounts (fresh SPA load) and immediately calls POST /api/auth/refresh.
 *  3. If the refresh succeeds → isAuthenticated becomes true → we navigate to /.
 *  4. If the refresh fails (or ?error= is present) → we show an error with a
 *     link back to /login.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the sign-in. Please try again.',
  missing_params: 'The sign-in flow was interrupted. Please try again.',
  token_exchange_failed: 'We could not complete the sign-in. Please try again.',
  userinfo_failed: 'We could not retrieve your account details. Please try again.',
  no_email: 'Your account does not have a verified email address. Please use email/password sign-up instead.',
  network_error: 'A network error occurred. Please check your connection and try again.',
  account_disabled: 'Your account has been disabled. Please contact support.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`;
}

export default function OAuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const errorCode = searchParams.get('error');
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    // If the backend passed an error in the query string, show it immediately.
    if (errorCode) return;

    // Wait for AuthContext to finish its silentRefresh on mount.
    if (isLoading) return;

    if (isAuthenticated) {
      navigate('/', { replace: true });
    } else {
      // Refresh cookie didn't work (expired, invalid, etc.)
      setAuthFailed(true);
    }
  }, [isLoading, isAuthenticated, navigate, errorCode]);

  // --- Error state ---
  if (errorCode || authFailed) {
    const message = errorCode ? friendlyError(errorCode) : 'Sign-in could not be completed. Please try again.';
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb auth-orb--1" />
          <div className="auth-orb auth-orb--2" />
        </div>

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-card-accent" />

          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😕</div>
            <h2 className="auth-heading" style={{ fontSize: '1.4rem' }}>Sign-in failed</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {message}
            </p>
            <Link to="/login" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Loading / redirecting state ---
  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-card-accent" />

        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div className="auth-spinner" style={{ width: 36, height: 36, margin: '0 auto 1.25rem' }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Completing sign-in…</p>
        </div>
      </motion.div>
    </div>
  );
}
