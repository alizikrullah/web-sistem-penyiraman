import { useEffect, useState } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getScheduleRecommendations } from '../lib/api';

const DAYS = [
  { key: 'mon', label: 'Sen' },
  { key: 'tue', label: 'Sel' },
  { key: 'wed', label: 'Rab' },
  { key: 'thu', label: 'Kam' },
  { key: 'fri', label: 'Jum' },
  { key: 'sat', label: 'Sab' },
  { key: 'sun', label: 'Min' },
];

interface Schedule {
  id: number;
  label: string;
  days: string[];
  startTime: string;
  durationMinutes: number;
  durationSeconds: number;
  isActive: boolean;
}

interface Recommendation {
  label: string;
  days: string[];
  startTime: string;
  durationMinutes: number;
  durationSeconds: number;
  reasoning: string;
}

const emptyForm = {
  label: '',
  days: [] as string[],
  startTime: '06:00',
  durationMinutes: 15,
  durationSeconds: 0,
};

const formatDuration = (minutes: number, seconds: number) => {
  if (seconds > 0) return `${minutes} menit ${seconds} detik`;
  return `${minutes} menit`;
};

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);

  const fetchSchedules = async () => {
    const res = await getSchedules();
    setSchedules(res.data);
  };

  useEffect(() => { fetchSchedules(); }, []);

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleSubmit = async () => {
    if (!form.label || form.days.length === 0) return;
    setLoading(true);
    try {
      if (editId !== null) {
        const current = schedules.find((s) => s.id === editId);
        await updateSchedule(editId, { ...form, isActive: current?.isActive ?? true });
      } else {
        await createSchedule(form);
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchSchedules();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: Schedule) => {
    setForm({ label: s.label, days: s.days, startTime: s.startTime, durationMinutes: s.durationMinutes, durationSeconds: s.durationSeconds });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    await deleteSchedule(id);
    fetchSchedules();
  };

  const handleToggleActive = async (s: Schedule) => {
    await updateSchedule(s.id, {
      label: s.label, days: s.days, startTime: s.startTime,
      durationMinutes: s.durationMinutes, durationSeconds: s.durationSeconds,
      isActive: !s.isActive,
    });
    fetchSchedules();
  };

  const handleGetRecommendations = async () => {
    setLoadingRecommend(true);
    setRecommendations([]);
    try {
      const res = await getScheduleRecommendations();
      setRecommendations(res.data.recommendations ?? []);
    } catch {
      alert('Gagal generate rekomendasi. Coba lagi.');
    } finally {
      setLoadingRecommend(false);
    }
  };

  const handleApplyRecommendation = async (rec: Recommendation, idx: number) => {
    setApplyingIdx(idx);
    try {
      await createSchedule(rec);
      setRecommendations(prev => prev.filter((_, i) => i !== idx));
      fetchSchedules();
    } catch {
      alert('Gagal menerapkan jadwal.');
    } finally {
      setApplyingIdx(null);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Jadwal Penyiraman</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleGetRecommendations}
            disabled={loadingRecommend}
            style={{ ...btnGhost, opacity: loadingRecommend ? 0.5 : 1, cursor: loadingRecommend ? 'not-allowed' : 'pointer' }}
          >
            {loadingRecommend ? 'Menganalisis...' : '✨ Rekomendasi AI'}
          </button>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} style={btnGreen}>
            + Tambah
          </button>
        </div>
      </div>

      {/* Rekomendasi AI */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rekomendasi AI
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ ...card, borderLeft: '3px solid var(--green)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{rec.label}</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {DAYS.map((d) => rec.days.includes(d.key) && (
                        <span key={d.key} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: 'var(--green)' }}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        🕐 <strong style={{ color: 'var(--text)' }}>{rec.startTime}</strong>
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        ⏱ <strong style={{ color: 'var(--text)' }}>{formatDuration(rec.durationMinutes, rec.durationSeconds)}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {rec.reasoning}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyRecommendation(rec, idx)}
                    disabled={applyingIdx === idx}
                    style={{ ...btnGreen, fontSize: '12px', padding: '8px 14px', flexShrink: 0, opacity: applyingIdx === idx ? 0.5 : 1 }}
                  >
                    {applyingIdx === idx ? 'Menerapkan...' : 'Terapkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '15px' }}>
            {editId ? 'Edit Jadwal' : 'Jadwal Baru'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nama Jadwal</label>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} style={inputStyle} placeholder="cth: Pagi, Sore" />
            </div>
            <div>
              <label style={labelStyle}>Hari</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    style={{
                      padding: '5px 10px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      borderColor: form.days.includes(d.key) ? 'var(--green)' : 'var(--border)',
                      background: form.days.includes(d.key) ? 'rgba(14,165,233,0.1)' : 'transparent',
                      color: form.days.includes(d.key) ? 'var(--green)' : 'var(--text-muted)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Jam Mulai</label>
                <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Durasi</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number" min={0} max={60}
                    value={form.durationMinutes} placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '' || parseInt(val) <= 60) setForm(f => ({ ...f, durationMinutes: val === '' ? 0 : parseInt(val) }));
                    }}
                    style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>mnt</span>
                  <input
                    type="number" min={0} max={59}
                    value={form.durationSeconds} placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '' || parseInt(val) <= 59) setForm(f => ({ ...f, durationSeconds: val === '' ? 0 : parseInt(val) }));
                    }}
                    style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dtk</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={handleSubmit} disabled={loading} style={btnGreen}>
                {loading ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah'}
              </button>
              <button onClick={() => setShowForm(false)} style={btnGhost}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Belum ada jadwal.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schedules.map((s) => (
            <div key={s.id} style={{ ...card, opacity: s.isActive ? 1 : 0.5, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{s.label}</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {DAYS.map((d) => s.days.includes(d.key) && (
                      <span key={d.key} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: 'var(--green)' }}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      🕐 <strong style={{ color: 'var(--text)' }}>{s.startTime}</strong>
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      ⏱ <strong style={{ color: 'var(--text)' }}>{formatDuration(s.durationMinutes, s.durationSeconds)}</strong>
                    </span>
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                  background: s.isActive ? 'rgba(14,165,233,0.1)' : 'rgba(100,116,139,0.1)',
                  color: s.isActive ? 'var(--green)' : 'var(--text-muted)',
                }}>
                  {s.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <button onClick={() => handleToggleActive(s)} style={{ ...btnGhost, flex: 1, fontSize: '12px' }}>
                  {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => handleEdit(s)} style={{ ...btnGhost, flex: 1, fontSize: '12px' }}>Edit</button>
                <button onClick={() => handleDelete(s.id)} style={{ ...btnDanger, flex: 1, fontSize: '12px' }}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '20px 16px', maxWidth: '860px', margin: '0 auto' };
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const };
const btnGreen: React.CSSProperties = { background: 'var(--green)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' };