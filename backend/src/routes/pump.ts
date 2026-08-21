import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPatch, dPost } from '../directus';

const router = Router();

const MAX_DURATION_SECONDS = 60 * 60; // 1 jam, konsisten sama MAX_PUMP_DURATION_MS di firmware

// Ambil state pompa — inisialisasi kalau belum ada
export async function getState() {
  const res = await dGet('/items/pump_state');
  if (!res.data) {
    const init = await dPost('/items/pump_state', { is_on: false, mode: 'auto' });
    return init.data;
  }
  return res.data;
}

// Helper buat log
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
    const state = await getState();
    const isDeviceOnline = state.last_heartbeat
      ? (Date.now() - new Date(state.last_heartbeat).getTime()) < 2 * 60 * 1000
      : false;

    res.json({
      isOn: state.is_on,
      mode: state.mode,
      pumpOffAt: state.pump_off_at ?? null, // null = tidak ada timer
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
      pump_off_at: null, // default: tidak ada timer
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
      pump_off_at: null, // selalu clear timer saat off
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
      pump_off_at: null, // clear timer saat balik ke auto
    });
    await createLog('off', 'system');
    res.json({ message: 'Mode dikembalikan ke auto' });
  } catch {
    res.status(500).json({ error: 'Gagal ubah mode' });
  }
});

export default router;