import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const USER = { id: '1', email: 'test@example.com', full_name: 'Test User', created_at: '2026-01-01T00:00:00Z' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const TestComponent = () => {
  const { user, isAuthenticated, isLoading, token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="auth-status">{isAuthenticated ? 'LoggedIn' : 'LoggedOut'}</span>
      <span data-testid="user-email">{user?.email || 'No User'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('test@example.com', 'Password123!')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stays logged out when the silent refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'no session' }, 401));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
    expect(screen.getByTestId('user-email').textContent).toBe('No User');
  });

  it('updates state on login and logout', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'no session' }, 401)) // silent refresh
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok123', token_type: 'bearer', user: USER })) // login
      .mockResolvedValueOnce(new Response(null, { status: 204 })); // logout

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'));

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedIn');
    expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');
    expect(screen.getByTestId('token').textContent).toBe('tok123');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
    expect(screen.getByTestId('token').textContent).toBe('none');
  });
});
