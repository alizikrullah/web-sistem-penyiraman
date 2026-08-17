import { useEffect, useState } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../lib/api';

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
  isActive: boolean;
}

const emptyForm = { label: '', days: [] as string[], startTime: '06:00', durationMinutes: 15 };

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setForm({ label: s.label, days: s.days, startTime: s.startTime, durationMinutes: s.durationMinutes });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    await deleteSchedule(id);
    fetchSchedules();
  };

  const handleToggleActive = async (s: Schedule) => {
    await updateSchedule(s.id, { ...s, startTime: s.startTime, durationMinutes: s.durationMinutes, isActive: !s.isActive });
    fetchSchedules();
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Jadwal Penyiraman</h2>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} style={btnGreen}>
          + Tambah Jadwal
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: '20px' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>{editId ? 'Edit Jadwal' : 'Jadwal Baru'}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nama Jadwal</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                style={inputStyle}
                placeholder="cth: Pagi, Sore"
              />
            </div>

            <div>
              <label style={labelStyle}>Hari</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
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

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Jam Mulai</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Durasi (menit)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={handleSubmit} disabled={loading} style={btnGreen}>
                {loading ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
              </button>
              <button onClick={() => setShowForm(false)} style={btnGhost}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Belum ada jadwal. Tambah jadwal di atas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schedules.map((s) => (
            <div key={s.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px', opacity: s.isActive ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{s.label}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {s.days.map((d) => DAYS.find((x) => x.key === d)?.label).join(', ')} · {s.startTime} · {s.durationMinutes} menit
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => handleToggleActive(s)} style={{ ...btnGhost, fontSize: '12px' }}>
                  {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => handleEdit(s)} style={{ ...btnGhost, fontSize: '12px' }}>Edit</button>
                <button onClick={() => handleDelete(s.id)} style={{ ...btnDanger, fontSize: '12px' }}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 24px', maxWidth: '860px', margin: '0 auto' };
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' };
const labelStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' };
const btnGreen: React.CSSProperties = { background: 'var(--green)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' };
