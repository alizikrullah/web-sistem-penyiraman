import { Router, Request, Response } from 'express';
import { requireDevice } from '../middleware/auth';
import { dGet, dPatch } from '../directus';
import { getState, createLog } from './pump';
import { createNotificationIfNew } from './notifications';

const router = Router();

const PUMP_WARNING_MINUTES = 45;

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

    // Cek apakah pompa nyala terlalu lama (manual mode, tanpa timer)
    if (state.is_on && state.mode === 'manual' && !state.pump_off_at) {
      const logsRes = await dGet('/items/logs', {
        'filter[event][_eq]': 'on',
        'sort': '-timestamp',
        'limit': '1',
      });
      if (logsRes.data?.length > 0) {
        const minutesOn = (Date.now() - new Date(logsRes.data[0].timestamp).getTime()) / 60000;
        if (minutesOn >= PUMP_WARNING_MINUTES) {
          await createNotificationIfNew(
            'Pompa Nyala Terlalu Lama',
            `Pompa sudah menyala selama ${Math.floor(minutesOn)} menit tanpa timer. Periksa sistem penyiraman.`,
            'warning',
            60
          );
        }
      }
    }

    res.json({ ok: true, serverTime: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Heartbeat gagal' });
  }
});

export default router;