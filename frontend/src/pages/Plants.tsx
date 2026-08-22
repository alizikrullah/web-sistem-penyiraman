import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getRows, createRow, updateRow, deleteRow,
  getPlants, createPlant, updatePlant, deletePlant,
  diagnosePlant, getDiagnoses,
} from '../lib/api';

interface Row {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
}

interface Plant {
  id: number;
  name: string;
  row: { id: number; name: string };
  type: string | null;
  planted_at: string | null;
  notes: string | null;
  status: string;
}

interface Diagnosis {
  id: number;
  content: string;
  image_url: string;
  date_created: string;
}

const emptyRowForm = { name: '', location: '', notes: '' };
const emptyPlantForm = { name: '', rowId: 0, type: '', planted_at: '', notes: '' };

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

const formatDateTime = (ts: string) =>
  new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

export default function Plants() {
  const [rows, setRows] = useState<Row[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);

  const [rowFormOpen, setRowFormOpen] = useState(false);
  const [rowFormData, setRowFormData] = useState(emptyRowForm);
  const [editRowId, setEditRowId] = useState<number | null>(null);

  const [plantFormRowId, setPlantFormRowId] = useState<number | null>(null);
  const [plantFormData, setPlantFormData] = useState(emptyPlantForm);
  const [editPlantId, setEditPlantId] = useState<number | null>(null);

  const [diagnosaPlantId, setDiagnosaPlantId] = useState<number | null>(null);
  const [diagnosaImage, setDiagnosaImage] = useState<File | null>(null);
  const [diagnosaPreview, setDiagnosaPreview] = useState<string | null>(null);
  const [diagnosaLoading, setDiagnosaLoading] = useState(false);
  const [diagnosaResult, setDiagnosaResult] = useState<Diagnosis | null>(null);
  const [diagnosaHistory, setDiagnosaHistory] = useState<Record<number, Diagnosis[]>>({});
  const [showHistory, setShowHistory] = useState<number | null>(null);
  const diagnosaFileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [rowsRes, plantsRes] = await Promise.all([getRows(), getPlants()]);
    setRows(rowsRes.data);
    setPlants(plantsRes.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const plantsByRow = plants.reduce((acc, plant) => {
    const rowId = plant.row.id;
    if (!acc[rowId]) acc[rowId] = [];
    acc[rowId].push(plant);
    return acc;
  }, {} as Record<number, Plant[]>);

  const handleRowSubmit = async () => {
    if (!rowFormData.name) return;
    setLoadingAction(true);
    try {
      if (editRowId !== null) {
        await updateRow(editRowId, rowFormData);
      } else {
        await createRow(rowFormData);
      }
      setRowFormData(emptyRowForm);
      setEditRowId(null);
      setRowFormOpen(false);
      fetchData();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEditRow = (row: Row) => {
    setRowFormData({ name: row.name, location: row.location ?? '', notes: row.notes ?? '' });
    setEditRowId(row.id);
    setRowFormOpen(true);
    setPlantFormRowId(null);
    closeDiagnosa();
  };

  const handleDeleteRow = async (id: number) => {
    if (!confirm('Hapus baris ini? Tanaman di baris ini perlu dipindah atau akan kehilangan referensi.')) return;
    await deleteRow(id);
    fetchData();
  };

  const openPlantForm = (rowId: number, plant?: Plant) => {
    if (plant) {
      setPlantFormData({ name: plant.name, rowId: plant.row.id, type: plant.type ?? '', planted_at: plant.planted_at ?? '', notes: plant.notes ?? '' });
      setEditPlantId(plant.id);
    } else {
      setPlantFormData({ ...emptyPlantForm, rowId });
      setEditPlantId(null);
    }
    setPlantFormRowId(rowId);
    setRowFormOpen(false);
    closeDiagnosa();
  };

  const closePlantForm = () => {
    setPlantFormRowId(null);
    setPlantFormData(emptyPlantForm);
    setEditPlantId(null);
  };

  const handlePlantSubmit = async () => {
    if (!plantFormData.name || !plantFormData.rowId) return;
    setLoadingAction(true);
    try {
      const payload = {
        name: plantFormData.name,
        row: plantFormData.rowId,
        type: plantFormData.type || null,
        planted_at: plantFormData.planted_at || null,
        notes: plantFormData.notes || null,
      };
      if (editPlantId !== null) {
        await updatePlant(editPlantId, payload);
      } else {
        await createPlant(payload);
      }
      closePlantForm();
      fetchData();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeletePlant = async (id: number) => {
    if (!confirm('Hapus tanaman ini?')) return;
    await deletePlant(id);
    fetchData();
  };

  const openDiagnosa = (plantId: number) => {
    setDiagnosaPlantId(plantId);
    setDiagnosaImage(null);
    setDiagnosaPreview(null);
    setDiagnosaResult(null);
    setPlantFormRowId(null);
    setRowFormOpen(false);
    setShowHistory(null);
  };

  const closeDiagnosa = () => {
    setDiagnosaPlantId(null);
    setDiagnosaImage(null);
    setDiagnosaPreview(null);
    setDiagnosaResult(null);
  };

  const handleDiagnosaImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDiagnosaImage(file);
    setDiagnosaResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setDiagnosaPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (diagnosaFileRef.current) diagnosaFileRef.current.value = '';
  };

  const handleDiagnosaSubmit = async (plantId: number) => {
    if (!diagnosaImage) return;
    setDiagnosaLoading(true);
    try {
      const res = await diagnosePlant(plantId, diagnosaImage);
      const result: Diagnosis = {
        id: res.data.id,
        content: res.data.content,
        image_url: res.data.imageUrl,
        date_created: new Date().toISOString(),
      };
      setDiagnosaResult(result);
      setDiagnosaImage(null);
      setDiagnosaPreview(null);
      if (showHistory === plantId) fetchDiagnosaHistory(plantId);
    } catch {
      alert('Gagal diagnosa. Coba lagi.');
    } finally {
      setDiagnosaLoading(false);
    }
  };

  const fetchDiagnosaHistory = async (plantId: number) => {
    try {
      const res = await getDiagnoses(plantId);
      setDiagnosaHistory(prev => ({ ...prev, [plantId]: res.data }));
    } catch {
      // silent fail
    }
  };

  const toggleHistory = async (plantId: number) => {
    if (showHistory === plantId) {
      setShowHistory(null);
    } else {
      setShowHistory(plantId);
      fetchDiagnosaHistory(plantId);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Tanaman</h2>
        <button
          onClick={() => { setRowFormData(emptyRowForm); setEditRowId(null); setRowFormOpen(true); setPlantFormRowId(null); closeDiagnosa(); }}
          style={btnGreen}
        >
          + Tambah Baris
        </button>
      </div>

      {rowFormOpen && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <h3 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '16px' }}>
            {editRowId ? 'Edit Baris' : 'Baris Baru'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nama Baris</label>
              <input value={rowFormData.name} onChange={e => setRowFormData(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="cth: Baris A, Pojok Kanan" />
            </div>
            <div>
              <label style={labelStyle}>Lokasi (opsional)</label>
              <input value={rowFormData.location} onChange={e => setRowFormData(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="cth: Dekat pagar, Sisi barat" />
            </div>
            <div>
              <label style={labelStyle}>Catatan (opsional)</label>
              <input value={rowFormData.notes} onChange={e => setRowFormData(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Catatan tambahan..." />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRowSubmit} disabled={loadingAction} style={btnGreen}>
                {loadingAction ? 'Menyimpan...' : editRowId ? 'Simpan' : 'Tambah'}
              </button>
              <button onClick={() => setRowFormOpen(false)} style={btnGhost}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>🌱</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada baris tanaman. Tambah baris dulu.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rows.map(row => {
            const rowPlants = plantsByRow[row.id] ?? [];
            const isShowingPlantForm = plantFormRowId === row.id;

            return (
              <div key={row.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '16px' }}>{row.name}</p>
                    {row.location && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>📍 {row.location}</p>}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{rowPlants.length} tanaman</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleEditRow(row)} style={{ ...btnGhost, fontSize: '12px', padding: '5px 10px' }}>Edit</button>
                    <button onClick={() => handleDeleteRow(row.id)} style={{ ...btnDanger, fontSize: '12px', padding: '5px 10px' }}>Hapus</button>
                  </div>
                </div>

                {isShowingPlantForm && (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                      {editPlantId ? 'Edit Tanaman' : 'Tambah Tanaman'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={labelStyle}>Nama Tanaman</label>
                        <input value={plantFormData.name} onChange={e => setPlantFormData(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="cth: Tomat, Cabai" />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Jenis (opsional)</label>
                          <input value={plantFormData.type} onChange={e => setPlantFormData(f => ({ ...f, type: e.target.value }))} style={inputStyle} placeholder="cth: Sayuran, Buah" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Tanggal Tanam (opsional)</label>
                          <input type="date" value={plantFormData.planted_at} onChange={e => setPlantFormData(f => ({ ...f, planted_at: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Catatan (opsional)</label>
                        <input value={plantFormData.notes} onChange={e => setPlantFormData(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Catatan tambahan..." />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handlePlantSubmit} disabled={loadingAction} style={btnGreen}>
                          {loadingAction ? 'Menyimpan...' : editPlantId ? 'Simpan' : 'Tambah'}
                        </button>
                        <button onClick={closePlantForm} style={btnGhost}>Batal</button>
                      </div>
                    </div>
                  </div>
                )}

                {rowPlants.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {rowPlants.map(plant => {
                      const isDiagnosing = diagnosaPlantId === plant.id;
                      return (
                        <div key={plant.id}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: isDiagnosing ? '8px 8px 0 0' : '8px',
                            borderBottom: isDiagnosing ? 'none' : undefined,
                          }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px' }}>{plant.name}</p>
                              <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                                {plant.type && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🏷️ {plant.type}</span>}
                                {plant.planted_at && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {formatDate(plant.planted_at)}</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => isDiagnosing ? closeDiagnosa() : openDiagnosa(plant.id)}
                                style={{ ...isDiagnosing ? btnGreenOutline : btnGhost, fontSize: '12px', padding: '5px 10px' }}
                              >
                                🔍 Diagnosa
                              </button>
                              <button onClick={() => openPlantForm(row.id, plant)} style={{ ...btnGhost, fontSize: '12px', padding: '5px 10px' }}>Edit</button>
                              <button onClick={() => handleDeletePlant(plant.id)} style={{ ...btnDanger, fontSize: '12px', padding: '5px 10px' }}>Hapus</button>
                            </div>
                          </div>

                          {isDiagnosing && (
                            <div style={{
                              background: 'var(--bg)', border: '1px solid var(--border)',
                              borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '14px',
                            }}>
                              <input
                                ref={diagnosaFileRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleDiagnosaImageSelect}
                              />

                              {!diagnosaResult ? (
                                <>
                                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    Upload foto {plant.name} untuk dianalisis kondisinya oleh AI.
                                  </p>
                                  {diagnosaPreview ? (
                                    <div style={{ marginBottom: '10px' }}>
                                      <img
                                        src={diagnosaPreview}
                                        alt="Preview"
                                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                                      />
                                      <button onClick={() => { setDiagnosaImage(null); setDiagnosaPreview(null); }} style={{ ...btnGhost, fontSize: '12px', marginTop: '6px' }}>
                                        Ganti foto
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => diagnosaFileRef.current?.click()}
                                      style={{ ...btnGhost, width: '100%', marginBottom: '10px', fontSize: '13px' }}
                                    >
                                      📷 Pilih Foto
                                    </button>
                                  )}
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleDiagnosaSubmit(plant.id)}
                                      disabled={!diagnosaImage || diagnosaLoading}
                                      style={{ ...btnGreen, opacity: !diagnosaImage || diagnosaLoading ? 0.5 : 1, fontSize: '13px' }}
                                    >
                                      {diagnosaLoading ? 'Menganalisis...' : 'Analisis'}
                                    </button>
                                    <button onClick={() => toggleHistory(plant.id)} style={{ ...btnGhost, fontSize: '13px' }}>
                                      {showHistory === plant.id ? 'Tutup riwayat' : 'Riwayat'}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  {diagnosaResult.image_url && (
                                    <a href={diagnosaResult.image_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={diagnosaResult.image_url}
                                        alt="Hasil diagnosa"
                                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', display: 'block', cursor: 'pointer' }}
                                      />
                                    </a>
                                  )}
                                  <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '10px' }}>
                                    {diagnosaResult.content}
                                  </p>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setDiagnosaResult(null)} style={{ ...btnGreen, fontSize: '13px' }}>
                                      Diagnosa lagi
                                    </button>
                                    <button onClick={() => toggleHistory(plant.id)} style={{ ...btnGhost, fontSize: '13px' }}>
                                      {showHistory === plant.id ? 'Tutup riwayat' : 'Riwayat'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showHistory === plant.id && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Riwayat Diagnosa
                                  </p>
                                  {(diagnosaHistory[plant.id] ?? []).length === 0 ? (
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Belum ada riwayat.</p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {(diagnosaHistory[plant.id] ?? []).map(d => (
                                        <div key={d.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                          {d.image_url && (
                                            <a href={d.image_url} target="_blank" rel="noopener noreferrer">
                                              <img
                                                src={d.image_url}
                                                alt="Diagnosa"
                                                style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                              />
                                            </a>
                                          )}
                                          <div style={{ padding: '10px' }}>
                                            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', marginBottom: '6px' }}>{d.content}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateTime(d.date_created)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isShowingPlantForm && (
                  <button onClick={() => openPlantForm(row.id)} style={{ ...btnGhost, width: '100%', fontSize: '13px' }}>
                    + Tambah Tanaman
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '20px 16px', maxWidth: '860px', margin: '0 auto' };

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const btnGreen: React.CSSProperties = {
  background: 'var(--green)', color: '#fff', fontWeight: 700, border: 'none',
  borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer',
};

const btnGreenOutline: React.CSSProperties = {
  background: 'rgba(14,165,233,0.1)', color: 'var(--green)', fontWeight: 600,
  border: '1px solid var(--green)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
  borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)',
  borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
};