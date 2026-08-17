import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logout } from '../lib/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/schedules', label: 'Jadwal', icon: '🕐' },
  { to: '/logs', label: 'Log', icon: '📋' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isMobile) {
    return (
      <>
        {/* Top branding header */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '48px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          zIndex: 100,
        }}>
          <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '16px' }}>
            💧 Penyiraman
          </span>
        </header>

        {/* Bottom navigation */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '64px',
          zIndex: 100,
        }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                  padding: '8px 20px',
                  borderRadius: '12px',
                  color: isActive ? 'var(--green)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(14,165,233,0.1)' : 'transparent',
                  minWidth: '72px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 400 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px 20px',
              minWidth: '72px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🚪</span>
            <span style={{ fontSize: '11px' }}>Logout</span>
          </button>
        </nav>
      </>
    );
  }

  // Desktop - top nav
  return (
    <nav style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
    }}>
      <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '16px' }}>
        💧 Penyiraman
      </span>
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
              background: location.pathname === item.to ? 'rgba(14,165,233,0.1)' : 'transparent',
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