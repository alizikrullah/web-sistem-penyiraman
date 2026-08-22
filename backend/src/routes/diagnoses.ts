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
const GROQ_MODEL_VISION = 'qwen/qwen3.6-27b';

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// POST /api/diagnoses
router.post('/diagnoses', requireAuth, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    const plantId = req.body.plant_id;

    if (!file) { res.status(400).json({ error: 'Gambar wajib diisi' }); return; }
    if (!plantId) { res.status(400).json({ error: 'Plant ID wajib diisi' }); return; }

    const plantRes = await dGet(`/items/plants/${plantId}`, { fields: '*,row.name' });
    const plant = plantRes.data;
    if (!plant) { res.status(404).json({ error: 'Tanaman tidak ditemukan' }); return; }

    const sensorRes = await dGet('/items/sensor_data', { sort: '-date_created', limit: '1' });
    const sensor = sensorRes.data?.[0] ?? null;

    const webpBuffer = await convertToWebp(file.buffer);
    const imageBase64 = webpBuffer.toString('base64');
    const imageUrl = await uploadToDirectus(webpBuffer, `diagnosis-${plantId}-${Date.now()}.webp`);

    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const prompt = `Kamu adalah ahli pertanian. Analisis kondisi tanaman dari foto ini dan berikan diagnosa singkat.

Info tanaman:
- Nama: ${plant.name}
- Jenis: ${plant.type || 'tidak diketahui'}
- Lokasi: ${plant.row?.name || 'tidak diketahui'}
- Tanggal tanam: ${plant.planted_at || 'tidak diketahui'}
- Catatan: ${plant.notes || '-'}
- Sensor: ${sensor ? `Suhu ${sensor.temperature}°C, Kelembapan ${sensor.humidity}%` : 'tidak ada data'}
- Waktu: ${now} WIB

ATURAN KETAT:
- Tulis HANYA jawaban final, tanpa proses berpikir
- DILARANG menulis tag <think> atau teks apapun sebelum jawaban
- DILARANG pakai **, ##, tabel, atau simbol formatting apapun
- Bahasa Indonesia santai, maksimal 5-6 kalimat
- Sebutkan: kondisi umum, masalah yang terdeteksi, kemungkinan penyebab, saran perawatan`;

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL_VISION,
        max_tokens: 512,
        reasoning_effort: 'none',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/webp;base64,${imageBase64}` } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!groqRes.ok) {
      console.error('[DIAGNOSE] Groq error:', await groqRes.text());
      res.status(500).json({ error: 'Gagal dapat respons dari AI' });
      return;
    }

    const groqData = await groqRes.json() as any;
    let content = groqData.choices?.[0]?.message?.content;

    if (!content) { res.status(500).json({ error: 'Respons AI kosong' }); return; }

    content = stripThinking(content);

    const saved = await dPost('/items/diagnoses', { plant: plantId, image_url: imageUrl, content });

    res.json({ content, imageUrl, id: saved.data?.id });
  } catch (e) {
    console.error('[DIAGNOSE]', e);
    res.status(500).json({ error: 'Gagal diagnosa tanaman' });
  }
});

// GET /api/diagnoses/:plantId
router.get('/diagnoses/:plantId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/diagnoses', {
      'filter[plant][_eq]': req.params.plantId,
      'sort': '-date_created',
      'limit': '10',
    });
    res.json(result.data ?? []);
  } catch {
    res.status(500).json({ error: 'Gagal ambil riwayat diagnosa' });
  }
});

export default router;