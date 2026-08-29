import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost, dPatch, dDelete } from '../directus';

const router = Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

function mapSchedule(s: any) {
  return {
    id: s.id,
    label: s.label,
    days: s.days,
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
    durationSeconds: s.duration_seconds ?? 0,
    isActive: s.is_active,
    createdAt: s.date_created,
  };
}

// GET /api/schedules
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/schedules', { sort: 'start_time' });
    res.json(result.data.map(mapSchedule));
  } catch {
    res.status(500).json({ error: 'Gagal ambil jadwal' });
  }
});

// POST /api/schedules
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { label, days, startTime, durationMinutes, durationSeconds } = req.body;

  if (!label || !days || !startTime || durationMinutes === undefined) {
    res.status(400).json({ error: 'Semua field wajib diisi' });
    return;
  }
  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: 'Days harus array dan tidak boleh kosong' });
    return;
  }

  try {
    const result = await dPost('/items/schedules', {
      label,
      days,
      start_time: startTime,
      duration_minutes: durationMinutes,
      duration_seconds: durationSeconds ?? 0,
      is_active: true,
    });
    res.status(201).json(mapSchedule(result.data));
  } catch {
    res.status(500).json({ error: 'Gagal buat jadwal' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { label, days, startTime, durationMinutes, durationSeconds, isActive } = req.body;

  try {
    const result = await dPatch(`/items/schedules/${id}`, {
      label,
      days,
      start_time: startTime,
      duration_minutes: durationMinutes,
      duration_seconds: durationSeconds ?? 0,
      is_active: isActive,
    });
    res.json(mapSchedule(result.data));
  } catch {
    res.status(500).json({ error: 'Gagal update jadwal' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await dDelete(`/items/schedules/${id}`);
    res.json({ message: 'Jadwal dihapus' });
  } catch {
    res.status(500).json({ error: 'Gagal hapus jadwal' });
  }
});

// POST /api/schedules/recommend
router.post('/recommend', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [sensorRes, schedulesRes, logsRes, plantsRes] = await Promise.all([
      dGet('/items/sensor_data', {
        'filter[date_created][_gte]': since48h,
        'sort': 'date_created',
        'limit': '500',
      }),
      dGet('/items/schedules', { 'filter[is_active][_eq]': 'true' }),
      dGet('/items/logs', { 'sort': '-timestamp', 'limit': '30' }),
      dGet('/items/plants', { 'fields': '*,row.name', 'sort': 'name' }),
    ]);

    const sensorData = sensorRes.data ?? [];
    const schedules = schedulesRes.data ?? [];
    const logs = logsRes.data ?? [];
    const plants = plantsRes.data ?? [];

    // Kelompokkan sensor data per jam (WIB = UTC+7)
    const hourlyMap: Record<number, { temps: number[]; hums: number[] }> = {};
    for (const s of sensorData) {
      const wibHour = (new Date(s.date_created).getUTCHours() + 7) % 24;
      if (!hourlyMap[wibHour]) hourlyMap[wibHour] = { temps: [], hums: [] };
      hourlyMap[wibHour].temps.push(parseFloat(s.temperature));
      hourlyMap[wibHour].hums.push(parseFloat(s.humidity));
    }

    const hourlySummary = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgTemp: (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1),
      avgHumidity: (data.hums.reduce((a, b) => a + b, 0) / data.hums.length).toFixed(1),
      samples: data.temps.length,
    })).sort((a, b) => a.hour - b.hour);

    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const prompt = `Kamu adalah sistem rekomendasi jadwal penyiraman tanaman otomatis. Analisis data berikut dan buat rekomendasi jadwal penyiraman.

Waktu sekarang: ${now} WIB

DAFTAR TANAMAN:
${plants.length > 0
  ? plants.map((p: any) => `- ${p.name} (${p.type || 'jenis tidak diketahui'}) di ${p.row?.name || '?'}`).join('\n')
  : 'Belum ada tanaman terdaftar.'}

JADWAL AKTIF SAAT INI:
${schedules.length > 0
  ? schedules.map((s: any) => `- ${s.label}: ${(s.days || []).join(',')} jam ${s.start_time}, ${s.duration_minutes} menit ${s.duration_seconds || 0} detik`).join('\n')
  : 'Belum ada jadwal aktif.'}

DATA SUHU & KELEMBAPAN PER JAM (48 jam terakhir, WIB):
${hourlySummary.length > 0
  ? hourlySummary.map(h => `- Jam ${String(h.hour).padStart(2,'0')}:00 => Suhu: ${h.avgTemp}°C, Kelembapan: ${h.avgHumidity}% (${h.samples} data)`).join('\n')
  : 'Belum ada data sensor.'}

LOG POMPA (30 terakhir):
${logs.length > 0
  ? logs.slice(0, 10).map((l: any) => `- Pompa ${l.event} (${l.trigger}) - ${l.timestamp}`).join('\n')
  : 'Belum ada log.'}

INSTRUKSI:
Berikan 2-3 rekomendasi jadwal penyiraman berdasarkan data di atas.
Pertimbangkan:
- Waktu dengan suhu rendah lebih ideal untuk menyiram (mengurangi evaporasi)
- Kelembapan rendah berarti tanaman butuh lebih banyak air
- Hindari overlap dengan jadwal yang sudah ada
- Untuk tanaman buah (anggur, lengkeng, sawo) butuh penyiraman konsisten

Jawab HANYA dengan JSON valid, tanpa teks apapun sebelum atau sesudah JSON:
{
  "recommendations": [
    {
      "label": "nama jadwal",
      "days": ["mon","tue","wed","thu","fri","sat","sun"],
      "startTime": "HH:MM",
      "durationMinutes": 0,
      "durationSeconds": 0,
      "reasoning": "alasan singkat dalam bahasa Indonesia santai"
    }
  ]
}`;

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!groqRes.ok) {
      console.error('[RECOMMEND] Groq error:', await groqRes.text());
      res.status(500).json({ error: 'Gagal generate rekomendasi' });
      return;
    }

    const groqData = await groqRes.json() as any;
    let content = groqData.choices?.[0]?.message?.content ?? '';

    // Strip thinking tags dan markdown
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (e) {
    console.error('[RECOMMEND]', e);
    res.status(500).json({ error: 'Gagal generate rekomendasi' });
  }
});

export default router;