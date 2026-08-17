import { useEffect, useState, useCallback } from 'react';
import { getStatus, pumpOn, pumpOff, setModeAuto } from '../lib/api';

interface Status {
  isOn: boolean;
  mode: 'auto' | 'manual';
  deviceOnline: boolean;
  lastHeartbeat: string | null;
}

const CONNECTION_TIMEOUT = 5 * 60 * 1000;

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(Date.now());

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getStatus();
      setStatus(res.data);
      setLastSuccessfulFetch(Date.now());
    } catch {
      // silent fail, lastSuccessfulFetch tidak di-update
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
      if (effectiveIsOn) {
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

  const connectionLost = Date.now() - lastSuccessfulFetch > CONNECTION_TIMEOUT;
  const effectiveIsOn = connectionLost ? false : status.isOn;

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Dashboard</h2>

      {connectionLost && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid var(--red)',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--red)',
        }}>
          Koneksi ke server terputus lebih dari 5 menit. Status pompa direset ke MATI.
        </div>
      )}

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
                background: effectiveIsOn ? 'var(--green)' : 'var(--text-muted)',
                boxShadow: effectiveIsOn ? '0 0 8px rgba(14,165,233,0.6)' : 'none',
              }}
            />
            <span style={{ fontSize: '28px', fontWeight: 700, color: effectiveIsOn ? 'var(--green)' : 'var(--text)' }}>
              {effectiveIsOn ? 'NYALA' : 'MATI'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Mode: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{status.mode.toUpperCase()}</span>
          </p>
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
              ? new Date(status.lastHeartbeat.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID', {
                  timeZone: 'Asia/Jakarta'
                })
              : '-'}
          </p>
        </div>

        {/* Kontrol Manual */}
        <div style={card}>
          <p style={cardLabel}>Kontrol Manual</p>
          <button
            onClick={handleToggle}
            disabled={loading || connectionLost}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: loading || connectionLost ? 'not-allowed' : 'pointer',
              background: effectiveIsOn ? 'var(--red)' : 'var(--green)',
              color: '#fff',
              opacity: loading || connectionLost ? 0.6 : 1,
            }}
          >
            {loading ? 'Memproses...' : effectiveIsOn ? '⏹ Matikan Pompa' : '▶ Nyalakan Pompa'}
          </button>

          {status.mode === 'manual' && !connectionLost && (
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