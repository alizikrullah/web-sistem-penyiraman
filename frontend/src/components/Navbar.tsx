import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/schedules', label: 'Jadwal' },
  { to: '/logs', label: 'Log' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '16px' }}>
          💧 Penyiraman
        </span>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              color: location.pathname === item.to ? 'var(--green)' : 'var(--text-muted)',
              background: location.pathname === item.to ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </nav>
  );
}
