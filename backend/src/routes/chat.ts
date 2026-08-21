import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost } from '../directus';

const router = Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const HISTORY_LIMIT = 20;

async function buildSystemPrompt(): Promise<string> {
  const [plantsRes, rowsRes, schedulesRes, sensorRes, logsRes] = await Promise.all([
    dGet('/items/plants', { 'fields': '*,row.name', 'sort': 'name' }),
    dGet('/items/rows', { 'sort': 'name' }),
    dGet('/items/schedules', { 'filter[is_active][_eq]': 'true' }),
    dGet('/items/sensor_data', { 'sort': '-date_created', 'limit': '1' }),
    dGet('/items/logs', { 'sort': '-timestamp', 'limit': '5' }),
  ]);

  const plants = plantsRes.data ?? [];
  const rows = rowsRes.data ?? [];
  const schedules = schedulesRes.data ?? [];
  const sensor = sensorRes.data?.[0] ?? null;
  const logs = logsRes.data ?? [];

  const plantsText = plants.length > 0
    ? plants.map((p: any) =>
        `- ${p.name}${p.type ? ` (${p.type})` : ''} di ${p.row?.name || '?'}${p.planted_at ? `, tanam: ${p.planted_at}` : ''}${p.notes ? `, catatan: ${p.notes}` : ''}`
      ).join('\n')
    : 'Belum ada tanaman.';

  const rowsText = rows.length > 0
    ? rows.map((r: any) => `- ${r.name}${r.location ? ` (${r.location})` : ''}`).join('\n')
    : 'Belum ada baris.';

  const schedulesText = schedules.length > 0
    ? schedules.map((s: any) => `- ${s.label}: ${s.days.join(', ')} jam ${s.start_time}, ${s.duration_minutes} menit`).join('\n')
    : 'Tidak ada jadwal aktif.';

  const sensorText = sensor
    ? `Suhu ${sensor.temperature}°C, Kelembapan ${sensor.humidity}% (update: ${sensor.date_created})`
    : 'Belum ada data sensor.';

  const logsText = logs.length > 0
    ? logs.map((l: any) => `- Pompa ${l.event === 'on' ? 'nyala' : 'mati'} (${l.trigger}) - ${l.timestamp}`).join('\n')
    : 'Belum ada log.';

  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  return `Kamu adalah asisten AI untuk sistem penyiraman tanaman otomatis GriviLabs. Bantu pemilik sistem memantau dan merawat tanamannya.

Waktu sekarang: ${now} WIB

BARIS TANAMAN:
${rowsText}

DAFTAR TANAMAN:
${plantsText}

JADWAL PENYIRAMAN AKTIF:
${schedulesText}

DATA SENSOR TERBARU:
${sensorText}

LOG POMPA (5 terakhir):
${logsText}

Jawab dalam bahasa Indonesia yang santai dan informatif. Berikan saran praktis berdasarkan data yang tersedia.`;
}

// GET /api/chat/history
router.get('/chat/history', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/chat_messages', {
      'sort': 'date_created',
      'limit': '100',
    });
    res.json(result.data ?? []);
  } catch {
    res.status(500).json({ error: 'Gagal ambil history chat' });
  }
});

// POST /api/chat
router.post('/chat', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Pesan tidak boleh kosong' });
      return;
    }

    // Simpan pesan user dulu
    await dPost('/items/chat_messages', { role: 'user', content: message.trim() });

    // Ambil 20 pesan terakhir sebagai history (termasuk yang baru disimpan)
    const historyRes = await dGet('/items/chat_messages', {
      'sort': '-date_created',
      'limit': String(HISTORY_LIMIT),
    });
    const history = (historyRes.data ?? []).reverse();

    // Build system prompt dengan context terbaru
    const systemPrompt = await buildSystemPrompt();

    // Panggil Groq
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[GROQ] Error:', errText);
      res.status(500).json({ error: 'Gagal dapat respons dari AI' });
      return;
    }

    const groqData = await groqRes.json() as any;
    const assistantContent = groqData.choices?.[0]?.message?.content;

    if (!assistantContent) {
      res.status(500).json({ error: 'Respons AI kosong' });
      return;
    }

    // Simpan respons assistant
    await dPost('/items/chat_messages', { role: 'assistant', content: assistantContent });

    res.json({ message: assistantContent });
  } catch (e) {
    console.error('[CHAT]', e);
    res.status(500).json({ error: 'Gagal proses pesan' });
  }
});

// DELETE /api/chat/history
router.delete('/chat/history', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const all = await dGet('/items/chat_messages', { 'fields': 'id', 'limit': '1000' });
    const ids = (all.data ?? []).map((m: any) => m.id);
    if (ids.length > 0) {
      await fetch(`${process.env.DIRECTUS_URL!.replace(/\/$/, '')}/items/chat_messages`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ids),
      });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal hapus history' });
  }
});

export default router;