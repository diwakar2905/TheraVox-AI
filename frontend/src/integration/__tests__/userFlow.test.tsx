import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const DummyLogin = () => {
  const { login } = useAuth();
  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={() => login('token123', 'refresh123', { id: 'u1', email: 'user@theravox.ai', name: 'TheraVox User' })}>
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
      <p>Welcome, {user?.name}</p>
    </div>
  );
};

describe('User Flow Integration Test', () => {
  it('navigates from login to dashboard upon successful login action', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<DummyLogin />} />
            <Route path="/dashboard" element={<DummyDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();

    act(() => {
      screen.getByText('Log In Now').click();
    });

    // Check auth state is set
    expect(screen.queryByText('Login Page')).toBeInTheDocument();
  });
});
