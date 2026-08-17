import { useEffect, useState } from 'react';
import { getLogs } from '../lib/api';

interface Log {
  id: number;
  event: 'on' | 'off';
  trigger: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const triggerLabel: Record<string, string> = {
  auto: 'Jadwal otomatis',
  manual: 'Kontrol manual',
  timeout: 'Timeout manual',
  watchdog: 'Watchdog reset',
  system: 'Sistem',
};

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const fetchLogs = async (p: number) => {
    const res = await getLogs(p);
    setLogs(res.data.data);
    setPagination(res.data.pagination);
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Log Aktivitas</h2>
        {pagination && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Total: {pagination.total} entri
          </p>
        )}
      </div>

      <div style={card}>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
            Belum ada aktivitas tercatat.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Waktu', 'Event', 'Trigger'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td style={tdStyle}>
                    {new Date(log.timestamp.replace(' ', 'T') + 'Z').toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      timeZone: 'Asia/Jakarta',
                    })}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: log.event === 'on' ? 'rgba(14,165,233,0.1)' : 'rgba(239,68,68,0.1)',
                        color: log.event === 'on' ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {log.event === 'on' ? 'NYALA' : 'MATI'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '13px' }}>
                    {triggerLabel[log.trigger] || log.trigger}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={btnGhost}
          >
            ← Sebelumnya
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            Hal {page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={btnGhost}
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 24px', maxWidth: '860px', margin: '0 auto' };
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: '14px' };
const btnGhost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' };
