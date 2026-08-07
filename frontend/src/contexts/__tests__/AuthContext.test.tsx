import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'LoggedIn' : 'LoggedOut'}</span>
      <span data-testid="user-email">{user?.email || 'No User'}</span>
      <button onClick={() => login('token123', 'refresh123', { id: '1', email: 'test@example.com', name: 'Test' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
    expect(screen.getByTestId('user-email').textContent).toBe('No User');
  });

  it('updates state on login and logout', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedIn');
    expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
  });
});
