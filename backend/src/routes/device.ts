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
      durationSeconds: s.duration_seconds ?? 0,
    }));

    // Cek apakah timer sudah expired di server
    if (state?.pump_off_at && state?.is_on) {
      const pumpOffAtMs = new Date(state.pump_off_at).getTime();
      if (Date.now() >= pumpOffAtMs) {
        await dPatch('/items/pump_state', { is_on: false, pump_off_at: null });
        await createLog('off', 'timer');
        res.json({
          mode: state?.mode ?? 'auto',
          pumpCommand: 'off',
          pumpOffAt: null,
          pumpOffInSeconds: null,
          schedules,
          serverTime: new Date().toISOString(),
        });
        return;
      }
    }

    const pumpOffAtMs = state?.pump_off_at
      ? new Date(state.pump_off_at).getTime()
      : null;

    const pumpOffInSeconds = pumpOffAtMs !== null
      ? Math.max(0, Math.round((pumpOffAtMs - Date.now()) / 1000))
      : null;

    res.json({
      mode: state?.mode ?? 'auto',
      pumpCommand: state?.is_on ? 'on' : 'off',
      pumpOffAt: state?.pump_off_at ?? null,
      pumpOffInSeconds,
      schedules,
      serverTime: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Poll gagal' });
  }
});

// POST /api/device/heartbeat
router.post('/heartbeat', requireDevice, async (req: Request, res: Response): Promise<void> => {
  const { isOn, trigger, currentState } = req.body;

  try {
    await dPatch('/items/pump_state', {
      last_heartbeat: new Date().toISOString(),
    });

    const state = await getState();

    // Sync state kalau mode auto
    if (state.mode === 'auto' && typeof isOn === 'boolean' && state.is_on !== isOn) {
      await dPatch('/items/pump_state', { is_on: isOn });
      await createLog(isOn ? 'on' : 'off', currentState || 'auto');
    }

    // ESP32 matiin pompa karena timer habis
    if (trigger === 'timer' && isOn === false) {
      await dPatch('/items/pump_state', { is_on: false, pump_off_at: null });
      await createLog('off', 'timer');
    }

    res.json({ ok: true, serverTime: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Heartbeat gagal' });
  }
});

export default router;