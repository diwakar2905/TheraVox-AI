import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const USER = { id: 'u1', email: 'user@theravox.ai', full_name: 'TheraVox User', created_at: '2026-01-01T00:00:00Z' };

const DummyLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  return (
    <div>
      <h1>Login Page</h1>
      <button
        onClick={async () => {
          await login(USER.email, 'Password123!');
          navigate('/dashboard');
        }}
      >
        Log In Now
      </button>
    </div>
  );
};

const DummyDashboard = () => {
  const { user } = useAuth();
  return (
    <div>
      <h1>User Dashboard</h1>
      <p>Welcome, {user?.full_name}</p>
    </div>
  );
};

describe('User Flow Integration Test', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('navigates from login to dashboard upon successful login', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'no session' }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', token_type: 'bearer', user: USER }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<DummyLogin />} />
            <Route path="/dashboard" element={<DummyDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('Log In Now').click();
    });

    await waitFor(() => expect(screen.getByText('User Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Welcome, TheraVox User')).toBeInTheDocument();
  });
});
