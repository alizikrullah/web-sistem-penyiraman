import { Router, Request, Response } from 'express';
import { requireDevice } from '../middleware/auth';
import db from '../db';
import { getState } from './pump';

const router = Router();

// GET /api/device/poll - ESP32 polling setiap 5 detik
router.get('/poll', requireDevice, (_req: Request, res: Response): void => {
  const state = getState() as any;

  const schedules = db.prepare(
    'SELECT * FROM schedules WHERE is_active = 1'
  ).all().map((s: any) => ({
    id: s.id,
    label: s.label,
    days: JSON.parse(s.days),
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
  }));

  res.json({
    mode: state.mode,
    // Kalau manual mode, ESP32 ikut perintah ini.
    // Kalau auto mode, ESP32 ignore dan kelola jadwalnya sendiri.
    pumpCommand: Boolean(state.is_on) ? 'on' : 'off',
    schedules,
    serverTime: new Date().toISOString(),
  });
});

// POST /api/device/heartbeat - ESP32 lapor kondisi terkini
router.post('/heartbeat', requireDevice, (req: Request, res: Response): void => {
  const { isOn, currentState } = req.body;

  db.prepare(`
    UPDATE pump_state 
    SET last_heartbeat = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  // Kalau ESP32 lapor state berubah di mode auto, update is_on supaya dashboard sinkron
  const state = db.prepare('SELECT mode FROM pump_state WHERE id = 1').get() as any;
  if (state.mode === 'auto' && typeof isOn === 'boolean') {
    const currentIsOn = db.prepare('SELECT is_on FROM pump_state WHERE id = 1').get() as any;
    if (Boolean(currentIsOn.is_on) !== isOn) {
      db.prepare('UPDATE pump_state SET is_on = ? WHERE id = 1').run(isOn ? 1 : 0);

      // Catat ke log
      const trigger = currentState || 'auto';
      db.prepare(`INSERT INTO logs (event, trigger) VALUES (?, ?)`).run(isOn ? 'on' : 'off', trigger);
    }
  }

  res.json({ ok: true, serverTime: new Date().toISOString() });
});

export default router;
