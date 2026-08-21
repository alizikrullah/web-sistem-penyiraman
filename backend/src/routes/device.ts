import { Router, Request, Response } from 'express';
import { requireDevice } from '../middleware/auth';
import { dGet, dPatch } from '../directus';
import { getState, createLog } from './pump';

const router = Router();

// GET /api/device/poll
router.get('/poll', requireDevice, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [stateRes, schedulesRes] = await Promise.all([
      dGet('/items/pump_state'),
      dGet('/items/schedules', { 'filter[is_active][_eq]': 'true' }),
    ]);

    const state = stateRes.data;
    const schedules = (schedulesRes.data || []).map((s: any) => ({
      id: s.id,
      label: s.label,
      days: s.days,
      startTime: s.start_time,
      durationMinutes: s.duration_minutes,
    }));

    res.json({
      mode: state?.mode ?? 'auto',
      pumpCommand: state?.is_on ? 'on' : 'off',
      schedules,
      serverTime: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Poll gagal' });
  }
});

// POST /api/device/heartbeat
router.post('/heartbeat', requireDevice, async (req: Request, res: Response): Promise<void> => {
  const { isOn, currentState } = req.body;

  try {
    // Update last_heartbeat
    await dPatch('/items/pump_state', {
      last_heartbeat: new Date().toISOString(),
    });

    // Sync is_on dari ESP32 kalau lagi mode auto
    const state = await getState();
    if (state.mode === 'auto' && typeof isOn === 'boolean' && state.is_on !== isOn) {
      await dPatch('/items/pump_state', { is_on: isOn });
      await createLog(isOn ? 'on' : 'off', currentState || 'auto');
    }

    res.json({ ok: true, serverTime: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Heartbeat gagal' });
  }
});

export default router;
