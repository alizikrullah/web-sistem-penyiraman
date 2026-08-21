import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost } from '../directus';

const router = Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function generateInsight(): Promise<string> {
  const [plantsRes, rowsRes, schedulesRes, sensorRes, logsRes] = await Promise.all([
    dGet('/items/plants', { fields: '*,row.name', sort: 'name' }),
    dGet('/items/rows', { sort: 'name' }),
    dGet('/items/schedules', { 'filter[is_active][_eq]': 'true' }),
    dGet('/items/sensor_data', { sort: '-date_created', limit: '24' }),
    dGet('/items/logs', { sort: '-timestamp', limit: '20' }),
  ]);

  const plants = plantsRes.data ?? [];
  const rows = rowsRes.data ?? [];
  const schedules = schedulesRes.data ?? [];
  const sensorReadings = sensorRes.data ?? [];
  const logs = logsRes.data ?? [];

  const latestSensor = sensorReadings[0] ?? null;

  const avgTemp = sensorReadings.length > 0
    ? (sensorReadings.reduce((sum: number, s: any) => sum + s.temperature, 0) / sensorReadings.length).toFixed(1)
    : null;

  const avgHumidity = sensorReadings.length > 0
    ? (sensorReadings.reduce((sum: number, s: any) => sum + s.humidity, 0) / sensorReadings.length).toFixed(1)
    : null;

  const pumpOnCount = logs.filter((l: any) => l.event === 'on').length;
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const prompt = `Kamu adalah asisten pertanian pintar. Buat ringkasan harian kondisi sistem penyiraman tanaman berdasarkan data berikut.

Waktu: ${now} WIB

Baris tanaman:
${rows.length > 0 ? rows.map((r: any) => `- ${r.name}${r.location ? ` (${r.location})` : ''}`).join('\n') : 'Belum ada baris.'}

Daftar tanaman:
${plants.length > 0 ? plants.map((p: any) => `- ${p.name}${p.type ? ` (${p.type})` : ''} di ${p.row?.name || '?'}${p.planted_at ? `, tanam: ${p.planted_at}` : ''}`).join('\n') : 'Belum ada tanaman.'}

Jadwal penyiraman aktif:
${schedules.length > 0 ? schedules.map((s: any) => `- ${s.label}: ${s.days.join(', ')} jam ${s.start_time}, ${s.duration_minutes} menit`).join('\n') : 'Tidak ada jadwal aktif.'}

Data sensor (24 jam terakhir, ${sensorReadings.length} data):
${latestSensor ? `- Suhu terkini: ${latestSensor.temperature}°C, Kelembapan terkini: ${latestSensor.humidity}%\n- Rata-rata suhu: ${avgTemp}°C, Rata-rata kelembapan: ${avgHumidity}%` : 'Belum ada data sensor.'}

Aktivitas pompa (20 log terakhir):
- Pompa nyala ${pumpOnCount} kali
${logs.slice(0, 5).map((l: any) => `- Pompa ${l.event === 'on' ? 'nyala' : 'mati'} (${l.trigger}) - ${l.timestamp}`).join('\n')}

INSTRUKSI:
- Tulis ringkasan harian dalam 3-5 kalimat singkat
- Bahasa Indonesia santai, seperti laporan singkat ke pemilik kebun
- Sebutkan kondisi umum tanaman, penyiraman hari ini, dan 1-2 saran praktis kalau ada
- JANGAN pakai tabel, **, ##, atau markdown apapun
- Langsung ke inti, tidak perlu basa-basi pembuka`;

  const groqRes = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await groqRes.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respons Groq kosong');
  return content;
}

// GET /api/insights/daily
router.get('/insights/daily', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Cek apakah sudah ada insight hari ini
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existing = await dGet('/items/ai_insights', {
      'filter[type][_eq]': 'daily',
      'filter[date_created][_gte]': startOfDay.toISOString(),
      'sort': '-date_created',
      'limit': '1',
    });

    if (existing.data?.length > 0) {
      res.json({ content: existing.data[0].content, generated_at: existing.data[0].date_created, fresh: false });
      return;
    }

    // Belum ada, generate baru
    const content = await generateInsight();
    const saved = await dPost('/items/ai_insights', { content, type: 'daily' });

    res.json({ content, generated_at: saved.data?.date_created ?? new Date().toISOString(), fresh: true });
  } catch (e) {
    console.error('[INSIGHT]', e);
    res.status(500).json({ error: 'Gagal generate insight' });
  }
});

// POST /api/insights/daily/refresh -- paksa generate ulang
router.post('/insights/daily/refresh', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const content = await generateInsight();
    const saved = await dPost('/items/ai_insights', { content, type: 'daily' });
    res.json({ content, generated_at: saved.data?.date_created ?? new Date().toISOString(), fresh: true });
  } catch (e) {
    console.error('[INSIGHT]', e);
    res.status(500).json({ error: 'Gagal refresh insight' });
  }
});

export default router;