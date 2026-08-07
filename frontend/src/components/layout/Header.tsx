import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FloatingNav } from '../ui/floating-navbar';
import type { NavItem } from '../ui/floating-navbar';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('');
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Home',     link: '/'        },
  { name: 'Vision',   link: '/vision'  },
  { name: 'Text',     link: '/text'    },
  { name: 'Audio',    link: '/audio'   },
  { name: 'Wellness', link: '/wellness'},
];

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const brand = (
    <Link
      to="/"
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <img
        src="/logo.png"
        alt="TheraVox logo"
        style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '6px' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span style={{
        fontSize: '20px',
        fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        fontFamily: 'Charter, serif',
        whiteSpace: 'nowrap',
      }}>
        TheraVox
      </span>
    </Link>
  );

  const cta = isAuthenticated && user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Link
        to="/profile"
        title={`Profile: ${user.full_name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--brand)',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 700,
          textDecoration: 'none',
          flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.8)',
          boxShadow: '0 2px 8px rgba(158,172,202,0.35)',
        }}
      >
        {user.full_name ? getInitials(user.full_name) : <User size={14} />}
      </Link>
      <button
        onClick={handleLogout}
        title="Sign out"
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '5px 12px',
          borderRadius: '9999px',
          background: 'none',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
          e.currentTarget.style.color = 'var(--text)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <LogOut size={13} />
        Sign out
      </button>
    </div>
  ) : (
    <Link
      to="/login"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 18px',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
        color: '#fff',
        backgroundColor: 'var(--brand)',
        boxShadow: '0 2px 8px rgba(158,172,202,0.4)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--brand-hover)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'var(--brand)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      Login
    </Link>
  );

  return <FloatingNav navItems={NAV_ITEMS} brand={brand} cta={cta} />;
}
