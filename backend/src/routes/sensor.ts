import { Router, Request, Response } from 'express';
import { requireAuth, requireSensorDevice } from '../middleware/auth';
import { dGet, dPost } from '../directus';

const router = Router();

// POST /api/device/sensor — ESP32 #2 kirim data DHT22
router.post('/device/sensor', requireSensorDevice, async (req: Request, res: Response): Promise<void> => {
  try {
    const { temperature, humidity } = req.body;

    if (typeof temperature !== 'number' || typeof humidity !== 'number') {
      res.status(400).json({ error: 'temperature dan humidity harus berupa angka' });
      return;
    }

    await dPost('/items/sensor_data', { temperature, humidity });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal simpan data sensor' });
  }
});

// GET /api/sensor — frontend ambil data sensor terbaru
router.get('/sensor', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const sensorRes = await dGet('/items/sensor_data', {
      sort: '-date_created',
      limit: '1',
    });

    const latest = sensorRes.data?.[0] ?? null;

    if (!latest) {
      res.json({ temperature: null, humidity: null, timestamp: null });
      return;
    }

    res.json({
      temperature: latest.temperature,
      humidity: latest.humidity,
      timestamp: latest.date_created,
    });
  } catch {
    res.status(500).json({ error: 'Gagal ambil data sensor' });
  }
});

export default router;