import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPatch, dPost } from '../directus';

const router = Router();

const MAX_DURATION_SECONDS = 60 * 60;

export async function getState() {
  const res = await dGet('/items/pump_state');
  if (!res.data) {
    const init = await dPost('/items/pump_state', { is_on: false, mode: 'auto' });
    return init.data;
  }
  return res.data;
}

export async function createLog(event: 'on' | 'off', trigger: string) {
  try {
    await dPost('/items/logs', {
      event,
      trigger,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[LOG] Gagal buat log:', e);
  }
}

// GET /api/status
router.get('/status', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    let state = await getState();

    // Auto-expire timer kalau sudah lewat waktunya
    if (state.pump_off_at && state.is_on) {
      const pumpOffAtMs = new Date(state.pump_off_at).getTime();
      if (Date.now() >= pumpOffAtMs) {
        await dPatch('/items/pump_state', { is_on: false, pump_off_at: null });
        await createLog('off', 'timer');
        state = { ...state, is_on: false, pump_off_at: null };
      }
    }

    const isDeviceOnline = state.last_heartbeat
      ? (Date.now() - new Date(state.last_heartbeat).getTime()) < 2 * 60 * 1000
      : false;

    res.json({
      isOn: state.is_on,
      mode: state.mode,
      pumpOffAt: state.pump_off_at ?? null,
      lastUpdated: state.date_updated,
      lastHeartbeat: state.last_heartbeat,
      deviceOnline: isDeviceOnline,
    });
  } catch {
    res.status(500).json({ error: 'Gagal ambil status' });
  }
});

// POST /api/pump/on
router.post('/pump/on', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { durationSeconds } = req.body;

    const updateData: Record<string, unknown> = {
      is_on: true,
      mode: 'manual',
      pump_off_at: null,
    };

    if (typeof durationSeconds === 'number' && durationSeconds > 0) {
      if (durationSeconds > MAX_DURATION_SECONDS) {
        res.status(400).json({ error: 'Durasi maksimal 1 jam (3600 detik)' });
        return;
      }
      updateData.pump_off_at = new Date(Date.now() + durationSeconds * 1000).toISOString();
    }

    await dPatch('/items/pump_state', updateData);
    await createLog('on', 'manual');
    res.json({ message: 'Pompa dinyalakan' });
  } catch {
    res.status(500).json({ error: 'Gagal nyalain pompa' });
  }
});

// POST /api/pump/off
router.post('/pump/off', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    await dPatch('/items/pump_state', {
      is_on: false,
      mode: 'manual',
      pump_off_at: null,
    });
    await createLog('off', 'manual');
    res.json({ message: 'Pompa dimatikan' });
  } catch {
    res.status(500).json({ error: 'Gagal matiin pompa' });
  }
});

// POST /api/mode/auto
router.post('/mode/auto', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    await dPatch('/items/pump_state', {
      mode: 'auto',
      is_on: false,
      pump_off_at: null,
    });
    await createLog('off', 'system');
    res.json({ message: 'Mode dikembalikan ke auto' });
  } catch {
    res.status(500).json({ error: 'Gagal ubah mode' });
  }
});

export default router;