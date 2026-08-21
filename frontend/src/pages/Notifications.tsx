import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../lib/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  is_read: boolean;
  date_created: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeConfig = {
  info: { color: 'var(--accent)', bg: 'rgba(14,165,233,0.1)', label: 'Info' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Peringatan' },
  alert: { color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', label: 'Alert' },
};

const formatTime = (ts: string) =>
  new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loadingReadAll, setLoadingReadAll] = useState(false);

  const fetchNotifications = useCallback(async (p: number) => {
    const res = await getNotifications(p);
    setNotifications(res.data.data);
    setPagination(res.data.pagination);
  }, []);

  useEffect(() => { fetchNotifications(page); }, [page, fetchNotifications]);

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    if (isRead) return;
    await markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    setLoadingReadAll(true);
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } finally {
      setLoadingReadAll(false);
    }
  };

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Notifikasi</h2>
        {hasUnread && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={loadingReadAll}
            style={btnGhost}
          >
            {loadingReadAll ? 'Memproses...' : 'Tandai semua dibaca'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada notifikasi.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(n => {
            const cfg = typeConfig[n.type] ?? typeConfig.info;
            return (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id, n.is_read)}
                style={{
                  ...card,
                  cursor: n.is_read ? 'default' : 'pointer',
                  background: n.is_read ? 'var(--bg-card)' : 'var(--bg-card)',
                  borderLeft: `4px solid ${cfg.color}`,
                  opacity: n.is_read ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: cfg.bg,
                        color: cfg.color,
                      }}>
                        {cfg.label}
                      </span>
                      {!n.is_read && (
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: cfg.color,
                          display: 'inline-block',
                        }} />
                      )}
                    </div>
                    <p style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '14px', marginBottom: '4px' }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {formatTime(n.date_created)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnGhost}>←</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            Hal {page} / {pagination.totalPages}
          </span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} style={btnGhost}>→</button>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '20px 16px', maxWidth: '860px', margin: '0 auto' };

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '16px',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  borderRadius: '8px',
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: '13px',
};