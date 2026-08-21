import { Router, Request, Response } from 'express';
import { requireAuth, requireSensorDevice } from '../middleware/auth';
import { dGet, dPost } from '../directus';
import { createNotificationIfNew } from './notifications';

const router = Router();

const TEMP_ALERT_THRESHOLD = 35;
const HUMIDITY_DROP_THRESHOLD = 20;
const HUMIDITY_CHECK_WINDOW_MINUTES = 30;

// POST /api/device/sensor
router.post('/device/sensor', requireSensorDevice, async (req: Request, res: Response): Promise<void> => {
  try {
    const { temperature, humidity } = req.body;

    if (typeof temperature !== 'number' || typeof humidity !== 'number') {
      res.status(400).json({ error: 'temperature dan humidity harus berupa angka' });
      return;
    }

    // Ambil data sensor sebelum simpan baru — untuk perbandingan kelembapan
    const recentRes = await dGet('/items/sensor_data', {
      'sort': '-date_created',
      'limit': '20',
    });

    // Simpan data baru
    await dPost('/items/sensor_data', { temperature, humidity });

    // Cek suhu terlalu tinggi
    if (temperature > TEMP_ALERT_THRESHOLD) {
      await createNotificationIfNew(
        'Suhu Terlalu Tinggi',
        `Suhu area tanaman mencapai ${temperature}°C. Pertimbangkan menambah frekuensi penyiraman.`,
        'alert',
        60
      );
    }

    // Cek kelembapan drop drastis dalam 30 menit terakhir
    const windowMs = HUMIDITY_CHECK_WINDOW_MINUTES * 60 * 1000;
    const baseline = recentRes.data?.find((s: any) =>
      new Date(s.date_created).getTime() <= Date.now() - windowMs
    );
    if (baseline) {
      const drop = baseline.humidity - humidity;
      if (drop >= HUMIDITY_DROP_THRESHOLD) {
        await createNotificationIfNew(
          'Kelembapan Turun Drastis',
          `Kelembapan turun ${drop.toFixed(1)}% dalam ${HUMIDITY_CHECK_WINDOW_MINUTES} menit (${baseline.humidity}% → ${humidity}%).`,
          'warning',
          60
        );
      }
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal simpan data sensor' });
  }
});

// GET /api/sensor
router.get('/sensor', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const sensorRes = await dGet('/items/sensor_data', {
      'sort': '-date_created',
      'limit': '1',
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