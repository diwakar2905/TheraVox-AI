/**
 * AuthContext — centralised authentication state for TheraVox AI.
 *
 * Security model:
 *  - Access token is stored IN MEMORY ONLY (never localStorage/sessionStorage).
 *  - Refresh token lives in an httpOnly cookie managed by the browser/server.
 *  - On every app mount the context attempts a silent refresh to rehydrate.
 *  - A setInterval fires every 12 minutes to rotate the access token before
 *    the 15-minute JWT expiry.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { setToken } from '../lib/api';
import { WellnessStorage } from '../lib/wellnessStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the initial rehydration request is in-flight */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Merge partial user data into the in-memory user state (e.g. after a profile update). */
  updateUser: (partial: Partial<AuthUser>) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SILENT_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

// Deduplicate the initial silent-refresh call.
// React StrictMode (dev only) mounts → unmounts → remounts, causing two
// simultaneous POST /api/auth/refresh requests with the same token. The
// server rotates the token on the first request, so the second request sees
// a revoked token and returns 401. We share a single in-flight promise so
// only one HTTP request is ever made for the initial rehydration.
let _silentRefreshInFlight: Promise<{ access_token: string; user: AuthUser }> | null = null;

const AUTH_TIMEOUT_MS = 10_000; // 10 s — abort if server doesn't respond

async function callAuthEndpoint(
  path: string,
  body?: Record<string, string>,
): Promise<{ access_token: string; user: AuthUser }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',          // sends httpOnly cookie automatically
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? `Request failed (${res.status})`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------------------------
  // Internal: store the new access token in memory & kick off the timer
  // ------------------------------------------------------------------
  const _storeTokenAndScheduleRefresh = useCallback(
    (accessToken: string, userData: AuthUser) => {
      setToken(accessToken);
      setUser(userData);
      WellnessStorage.setUserId(userData.id);

      // Clear any existing timer before scheduling a new one
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

      refreshTimerRef.current = setInterval(async () => {
        try {
          const data = await callAuthEndpoint('/api/auth/refresh');
          setToken(data.access_token);
          setUser(data.user);
        } catch {
          // Refresh failed — session ended
          setToken(null);
          setUser(null);
          if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        }
      }, SILENT_REFRESH_INTERVAL_MS);
    },
    [],
  );

  // ------------------------------------------------------------------
  // On mount: attempt silent rehydration via refresh-token cookie
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Share a single in-flight request across Strict Mode double-invocation.
        if (!_silentRefreshInFlight) {
          _silentRefreshInFlight = callAuthEndpoint('/api/auth/refresh').finally(() => {
            _silentRefreshInFlight = null;
          });
        }
        const data = await _silentRefreshInFlight;
        if (!cancelled) _storeTokenAndScheduleRefresh(data.access_token, data.user);
      } catch {
        // No valid session — stay logged out
        if (!cancelled) setToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [_storeTokenAndScheduleRefresh]);

  // ------------------------------------------------------------------
  // Cleanup timer on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await callAuthEndpoint('/api/auth/login', { email, password });
      _storeTokenAndScheduleRefresh(data.access_token, data.user);
    },
    [_storeTokenAndScheduleRefresh],
  );

  const register = useCallback(
    async (full_name: string, email: string, password: string) => {
      const data = await callAuthEndpoint('/api/auth/register', {
        full_name,
        email,
        password,
      });
      _storeTokenAndScheduleRefresh(data.access_token, data.user);
    },
    [_storeTokenAndScheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort logout — clear client state regardless
    }
    setToken(null);
    setUser(null);
    WellnessStorage.setUserId(null);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
