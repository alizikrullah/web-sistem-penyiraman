import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logout, getUnreadCount } from '../lib/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/schedules', label: 'Jadwal', icon: '🕐' },
  { to: '/tanaman', label: 'Tanaman', icon: '🌱' },
  { to: '/logs', label: 'Log', icon: '📋' },
];

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await getUnreadCount();
        setUnreadCount(res.data.count);
      } catch {
        // silent fail
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Badge = () =>
    unreadCount > 0 ? (
      <span style={{
        position: 'absolute',
        top: '-4px',
        right: '-4px',
        background: 'var(--red)',
        color: '#fff',
        borderRadius: '10px',
        fontSize: '9px',
        fontWeight: 700,
        padding: '1px 5px',
        minWidth: '16px',
        textAlign: 'center',
        lineHeight: '14px',
      }}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    ) : null;

  if (isMobile) {
    return (
      <>
        {/* Top header — brand + notif + logout */}
        <header style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '48px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '16px',
          paddingRight: '8px',
          zIndex: 100,
        }}>
          <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '16px' }}>
            💧 Penyiraman
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link
              to="/notifications"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '8px',
                background: location.pathname === '/notifications' ? 'rgba(14,165,233,0.1)' : 'transparent',
              }}
            >
              <BellIcon />
              <Badge />
            </Link>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        {/* Bottom nav — 4 item saja */}
        <nav style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
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
                  padding: '8px 16px',
                  borderRadius: '12px',
                  color: isActive ? 'var(--green)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(14,165,233,0.1)' : 'transparent',
                  minWidth: '56px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 400 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </>
    );
  }

  // Desktop
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          to="/notifications"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            background: location.pathname === '/notifications' ? 'rgba(14,165,233,0.1)' : 'transparent',
          }}
        >
          <BellIcon />
          <Badge />
        </Link>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <LogoutIcon />
        </button>
      </div>
    </nav>
  );
}