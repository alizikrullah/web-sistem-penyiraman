import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logout, getUnreadCount } from '../lib/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/schedules', label: 'Jadwal', icon: '🕐' },
  { to: '/tanaman', label: 'Tanaman', icon: '🌱' },
  { to: '/notifications', label: 'Notifikasi', icon: '🔔' },
  { to: '/logs', label: 'Log', icon: '📋' },
];

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

  // Reset badge saat buka halaman notifikasi
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Badge = () =>
    unreadCount > 0 ? (
      <span style={{
        position: 'absolute',
        top: '0px',
        right: '0px',
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
        <header style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
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
            const isNotif = item.to === '/notifications';
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                  padding: '8px 8px',
                  borderRadius: '12px',
                  color: isActive ? 'var(--green)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(14,165,233,0.1)' : 'transparent',
                  minWidth: '48px',
                }}
              >
                <span style={{ fontSize: '18px', position: 'relative', display: 'inline-block' }}>
                  {item.icon}
                  {isNotif && <Badge />}
                </span>
                <span style={{ fontSize: '9px', fontWeight: isActive ? 700 : 400 }}>
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
              padding: '8px 8px',
              minWidth: '48px',
            }}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            <span style={{ fontSize: '9px' }}>Logout</span>
          </button>
        </nav>
      </>
    );
  }

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
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const isNotif = item.to === '/notifications';
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                position: 'relative',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--green)' : 'var(--text-muted)',
                background: isActive ? 'rgba(14,165,233,0.1)' : 'transparent',
              }}
            >
              {item.label}
              {isNotif && <Badge />}
            </Link>
          );
        })}
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