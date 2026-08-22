import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost } from '../directus';
import multer from 'multer';
import { convertToWebp, uploadToDirectus } from '../lib/upload';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan') as any, false);
  },
});

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_TEXT = 'openai/gpt-oss-120b';
const GROQ_MODEL_VISION = 'qwen/qwen3.6-27b';
const HISTORY_LIMIT = 20;

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

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
    ? plants.map((p: any) => `- ${p.name}${p.type ? ` (${p.type})` : ''} di ${p.row?.name || '?'}${p.planted_at ? `, tanam: ${p.planted_at}` : ''}${p.notes ? `, catatan: ${p.notes}` : ''}`).join('\n')
    : 'Belum ada tanaman.';

  const rowsText = rows.length > 0
    ? rows.map((r: any) => `- ${r.name}${r.location ? ` (${r.location})` : ''}`).join('\n')
    : 'Belum ada baris.';

  const schedulesText = schedules.length > 0
    ? schedules.map((s: any) => `- ${s.label}: ${s.days.join(', ')} jam ${s.start_time}, ${s.duration_minutes} menit`).join('\n')
    : 'Tidak ada jadwal aktif.';

  const sensorText = sensor
    ? `Suhu ${sensor.temperature}°C, Kelembapan ${sensor.humidity}%`
    : 'Belum ada data sensor.';

  const logsText = logs.length > 0
    ? logs.map((l: any) => `- Pompa ${l.event === 'on' ? 'nyala' : 'mati'} (${l.trigger}) - ${l.timestamp}`).join('\n')
    : 'Belum ada log.';

  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  return `Kamu adalah asisten AI untuk sistem penyiraman tanaman GriviLabs.

ATURAN KETAT:
- Tulis HANYA jawaban final, tanpa proses berpikir
- DILARANG menulis tag <think> atau apapun sebelum jawaban
- DILARANG pakai **, ##, tabel markdown, atau simbol formatting apapun
- Jawab singkat, santai, seperti WhatsApp
- Jawab sesuai yang ditanya saja, tidak perlu laporan lengkap
- Kalau ada gambar tanaman, analisis kondisinya dan berikan saran perawatan

DATA REFERENSI:
Waktu: ${now} WIB
Baris: ${rowsText}
Tanaman: ${plantsText}
Jadwal: ${schedulesText}
Sensor: ${sensorText}
Log pompa: ${logsText}`;
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
router.post('/chat', requireAuth, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const message = (req.body.message || '').trim();
    const file = (req as any).file;
    const hasImage = !!file;

    if (!message && !hasImage) {
      res.status(400).json({ error: 'Pesan atau gambar harus diisi' });
      return;
    }

    let imageUrl: string | null = null;
    let imageBase64: string | null = null;

    if (hasImage) {
      const webpBuffer = await convertToWebp(file.buffer);
      imageBase64 = webpBuffer.toString('base64');
      imageUrl = await uploadToDirectus(webpBuffer, `chat-${Date.now()}.webp`);
    }

    const userContent = message || '[Gambar]';
    await dPost('/items/chat_messages', {
      role: 'user',
      content: userContent,
      image_url: imageUrl,
    });

    const historyRes = await dGet('/items/chat_messages', {
      'sort': '-date_created',
      'limit': String(HISTORY_LIMIT),
    });
    const history = (historyRes.data ?? []).reverse();
    const systemPrompt = await buildSystemPrompt();
    const model = hasImage ? GROQ_MODEL_VISION : GROQ_MODEL_TEXT;

    const groqMessages: any[] = [{ role: 'system', content: systemPrompt }];

    const historyWithoutLast = history.slice(0, -1);
    for (const m of historyWithoutLast) {
      groqMessages.push({
        role: m.role,
        content: m.image_url
          ? (m.content === '[Gambar]' ? '[User mengirim gambar sebelumnya]' : m.content)
          : m.content,
      });
    }

    if (hasImage) {
      const content: any[] = [
        { type: 'image_url', image_url: { url: `data:image/webp;base64,${imageBase64}` } },
      ];
      if (message) content.push({ type: 'text', text: message });
      groqMessages.push({ role: 'user', content });
    } else {
      groqMessages.push({ role: 'user', content: message });
    }

    const requestBody: any = { model, max_tokens: 1024, messages: groqMessages };
    if (hasImage) requestBody.reasoning_effort = 'none';

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!groqRes.ok) {
      console.error('[GROQ] Error:', await groqRes.text());
      res.status(500).json({ error: 'Gagal dapat respons dari AI' });
      return;
    }

    const groqData = await groqRes.json() as any;
    let assistantContent = groqData.choices?.[0]?.message?.content;

    if (!assistantContent) {
      res.status(500).json({ error: 'Respons AI kosong' });
      return;
    }

    assistantContent = stripThinking(assistantContent);

    await dPost('/items/chat_messages', { role: 'assistant', content: assistantContent, image_url: null });
    res.json({ message: assistantContent, imageUrl });
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