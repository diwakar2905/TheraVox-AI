import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ maxWidth: '520px', margin: '96px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧭</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--brand)',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
