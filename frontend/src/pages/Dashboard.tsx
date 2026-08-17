import { useEffect, useState, useCallback } from 'react';
import { getStatus, pumpOn, pumpOff, setModeAuto } from '../lib/api';

interface Status {
  isOn: boolean;
  mode: 'auto' | 'manual';
  deviceOnline: boolean;
  lastHeartbeat: string | null;
  manualExpiresAt: string | null;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getStatus();
      setStatus(res.data);
    } catch {
      // silent fail, retry on next interval
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (!status) return;
    setLoading(true);
    try {
      if (status.isOn) {
        await pumpOff();
      } else {
        await pumpOn();
      }
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseAuto = async () => {
    setLoading(true);
    try {
      await setModeAuto();
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div style={pageStyle}>
        <p style={{ color: 'var(--text-muted)' }}>Memuat status...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

        {/* Status Card */}
        <div style={card}>
          <p style={cardLabel}>Status Pompa</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: status.isOn ? 'var(--green)' : 'var(--text-muted)',
                boxShadow: status.isOn ? '0 0 8px rgba(14,165,233,0.6)' : 'none',
              }}
            />
            <span style={{ fontSize: '28px', fontWeight: 700, color: status.isOn ? 'var(--green)' : 'var(--text)' }}>
              {status.isOn ? 'NYALA' : 'MATI'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Mode: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{status.mode.toUpperCase()}</span>
          </p>
          {status.mode === 'manual' && status.manualExpiresAt && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Auto-release: {new Date(status.manualExpiresAt).toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>

        {/* Device Status Card */}
        <div style={card}>
          <p style={cardLabel}>Status ESP32</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: status.deviceOnline ? 'var(--green)' : 'var(--red)',
              }}
            />
            <span style={{ fontSize: '20px', fontWeight: 600 }}>
              {status.deviceOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Heartbeat terakhir:{' '}
            {status.lastHeartbeat
              ? new Date(status.lastHeartbeat).toLocaleTimeString('id-ID')
              : '-'}
          </p>
        </div>

        {/* Kontrol Manual */}
        <div style={card}>
          <p style={cardLabel}>Kontrol Manual</p>
          <button
            onClick={handleToggle}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: status.isOn ? 'var(--red)' : 'var(--green)',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Memproses...' : status.isOn ? '⏹ Matikan Pompa' : '▶ Nyalakan Pompa'}
          </button>

          {status.mode === 'manual' && (
            <button
              onClick={handleReleaseAuto}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Kembalikan ke Mode Auto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: '28px 24px',
  maxWidth: '900px',
  margin: '0 auto',
};

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '20px',
};

const cardLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
