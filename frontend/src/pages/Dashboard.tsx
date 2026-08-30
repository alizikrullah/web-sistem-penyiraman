import { useEffect, useState, useCallback } from 'react';
import { getStatus, pumpOn, pumpOff, setModeAuto, getSensorData, getDailyInsight, refreshDailyInsight } from '../lib/api';

interface Status {
  isOn: boolean;
  mode: 'auto' | 'manual';
  pumpOffAt: string | null;
  scheduleEndAt: string | null;
  deviceOnline: boolean;
  lastHeartbeat: string | null;
  sensorOnline: boolean;
  sensorLastHeartbeat: string | null;
}

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  timestamp: string | null;
}

interface Insight {
  content: string;
  generated_at: string;
}

const CONNECTION_TIMEOUT = 5 * 60 * 1000;

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(Date.now());
  const [inputMinutes, setInputMinutes] = useState<string>('');
  const [inputSeconds, setInputSeconds] = useState<string>('');
  const [countdown, setCountdown] = useState<string | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string>('Mati otomatis');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getStatus();
      setStatus(res.data);
      setLastSuccessfulFetch(Date.now());
    } catch {
      // silent fail
    }
  }, []);

  const fetchSensorData = useCallback(async () => {
    try {
      const res = await getSensorData();
      setSensorData(res.data);
    } catch {
      // silent fail
    }
  }, []);

  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const res = await getDailyInsight();
      setInsight({ content: res.data.content, generated_at: res.data.generated_at });
    } catch {
      // silent fail
    } finally {
      setLoadingInsight(false);
    }
  }, []);

  const handleRefreshInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await refreshDailyInsight();
      setInsight({ content: res.data.content, generated_at: res.data.generated_at });
    } catch {
      // silent fail
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 60000);
    return () => clearInterval(interval);
  }, [fetchSensorData]);

  useEffect(() => { fetchInsight(); }, [fetchInsight]);

  useEffect(() => {
    if (!status?.isOn) { setCountdown(null); return; }

    const endAt = status.mode === 'manual' ? status.pumpOffAt : status.scheduleEndAt;
    if (!endAt) { setCountdown(null); return; }

    setCountdownLabel(status.mode === 'manual' ? 'Mati otomatis' : 'Jadwal selesai');

    const update = () => {
      const endMs = status.mode === 'manual'
        ? new Date(endAt.replace(' ', 'T') + (endAt.includes('Z') ? '' : 'Z')).getTime()
        : new Date(endAt).getTime();

      const remaining = endMs - Date.now();
      if (remaining <= 0) {
        setCountdown('00:00');
        fetchStatus();
        return;
      }
      const totalSeconds = Math.ceil(remaining / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status?.pumpOffAt, status?.scheduleEndAt, status?.isOn, status?.mode, fetchStatus]);

  const handleToggle = async () => {
    if (!status) return;
    setLoading(true);
    try {
      if (effectiveIsOn) {
        await pumpOff();
      } else {
        const totalSeconds = (parseInt(inputMinutes) || 0) * 60 + (parseInt(inputSeconds) || 0);
        await pumpOn(totalSeconds > 0 ? totalSeconds : undefined);
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

  const formatTime = (timestamp: string) => {
    const normalized = timestamp.replace(' ', 'T');
    const withTz = normalized.endsWith('Z') || normalized.includes('+') ? normalized : normalized + 'Z';
    return new Date(withTz).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
  };

  const formatInsightTime = (ts: string) =>
    new Date(ts).toLocaleString('id-ID', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

  const StatusPompaCard = (
    <div style={card}>
      <p style={cardLabel}>Status Pompa</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
          background: effectiveIsOn ? 'var(--green)' : 'var(--text-muted)',
          boxShadow: effectiveIsOn ? '0 0 8px rgba(14,165,233,0.6)' : 'none',
        }} />
        <span style={{ fontSize: '28px', fontWeight: 700, color: effectiveIsOn ? 'var(--green)' : 'var(--text)' }}>
          {effectiveIsOn ? 'NYALA' : 'MATI'}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Mode: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{status.mode.toUpperCase()}</span>
      </p>
      {countdown && !connectionLost && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {countdownLabel}: <span style={{ color: 'var(--green)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{countdown}</span>
        </p>
      )}
    </div>
  );

  const ESPPompaCard = (
    <div style={card}>
      <p style={cardLabel}>ESP Pompa</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
          background: status.deviceOnline ? 'var(--green)' : 'var(--red)',
        }} />
        <span style={{ fontSize: '20px', fontWeight: 600 }}>
          {status.deviceOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Heartbeat terakhir:{' '}
        {status.lastHeartbeat ? formatTime(status.lastHeartbeat) : '-'}
      </p>
    </div>
  );

  const ESPDHTCard = (
    <div style={card}>
      <p style={cardLabel}>ESP DHT22</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
          background: status.sensorOnline ? 'var(--green)' : 'var(--red)',
        }} />
        <span style={{ fontSize: '20px', fontWeight: 600 }}>
          {status.sensorOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Heartbeat terakhir:{' '}
        {status.sensorLastHeartbeat ? formatTime(status.sensorLastHeartbeat) : '-'}
      </p>
    </div>
  );

  const SuhuCard = (
    <div style={card}>
      <p style={cardLabel}>Suhu</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
        <span style={{ fontSize: '36px', fontWeight: 700 }}>
          {sensorData?.temperature != null ? sensorData.temperature.toFixed(1) : '-'}
        </span>
        {sensorData?.temperature != null && (
          <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>°C</span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {sensorData?.timestamp ? `Update: ${formatTime(sensorData.timestamp)}` : 'Belum ada data'}
      </p>
    </div>
  );

  const KelembapanCard = (
    <div style={card}>
      <p style={cardLabel}>Kelembapan</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
        <span style={{ fontSize: '36px', fontWeight: 700 }}>
          {sensorData?.humidity != null ? sensorData.humidity.toFixed(1) : '-'}
        </span>
        {sensorData?.humidity != null && (
          <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>%</span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {sensorData?.timestamp ? `Update: ${formatTime(sensorData.timestamp)}` : 'Belum ada data'}
      </p>
    </div>
  );

  const KontrolCard = (
    <div style={card}>
      <p style={cardLabel}>Kontrol Manual</p>
      {!effectiveIsOn && !connectionLost && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Durasi (opsional — kosongkan untuk toggle biasa)
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number" min={0} max={60}
              value={inputMinutes} placeholder="0"
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val === '' || parseInt(val) <= 60) setInputMinutes(val);
              }}
              style={inputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>menit</span>
            <input
              type="number" min={0} max={59}
              value={inputSeconds} placeholder="0"
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val === '' || parseInt(val) <= 59) setInputSeconds(val);
              }}
              style={inputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>detik</span>
          </div>
        </div>
      )}
      <button
        onClick={handleToggle}
        disabled={loading || connectionLost}
        style={{
          width: '100%', marginTop: '16px', padding: '14px',
          borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '15px',
          cursor: loading || connectionLost ? 'not-allowed' : 'pointer',
          background: effectiveIsOn ? 'var(--red)' : 'var(--green)',
          color: '#fff', opacity: loading || connectionLost ? 0.6 : 1,
        }}
      >
        {loading ? 'Memproses...' : effectiveIsOn ? '⏹ Matikan Pompa' : '▶ Nyalakan Pompa'}
      </button>
      {status.mode === 'manual' && !connectionLost && (
        <button
          onClick={handleReleaseAuto}
          disabled={loading}
          style={{
            width: '100%', marginTop: '10px', padding: '10px',
            borderRadius: '8px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Kembalikan ke Mode Auto
        </button>
      )}
    </div>
  );

  const InsightCard = (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={cardLabel}>Ringkasan Harian AI</p>
        <button
          onClick={handleRefreshInsight}
          disabled={loadingInsight}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: '6px',
            padding: '4px 10px', cursor: loadingInsight ? 'not-allowed' : 'pointer',
            fontSize: '12px', opacity: loadingInsight ? 0.5 : 1,
          }}
        >
          {loadingInsight ? 'Memuat...' : '↻ Refresh'}
        </button>
      </div>
      {loadingInsight && !insight ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Generating insight...</p>
      ) : insight ? (
        <>
          <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text)' }}>{insight.content}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Dibuat: {formatInsightTime(insight.generated_at)}
          </p>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Gagal memuat insight.</p>
      )}
    </div>
  );

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Dashboard</h2>

      {connectionLost && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)',
          borderRadius: '8px', padding: '10px 16px', marginBottom: '16px',
          fontSize: '13px', color: 'var(--red)',
        }}>
          Koneksi ke server terputus lebih dari 5 menit. Status pompa direset ke MATI.
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {StatusPompaCard}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {SuhuCard}
            {KelembapanCard}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {ESPPompaCard}
            {ESPDHTCard}
          </div>
          {KontrolCard}
          {InsightCard}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {StatusPompaCard}
            {ESPPompaCard}
            {SuhuCard}
            {KelembapanCard}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {ESPDHTCard}
            {KontrolCard}
          </div>
          <div>
            {InsightCard}
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 24px', maxWidth: '1000px', margin: '0 auto' };
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' };
const cardLabel: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 };
const inputStyle: React.CSSProperties = { width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', textAlign: 'center' };