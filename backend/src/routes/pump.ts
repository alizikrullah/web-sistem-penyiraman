import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../db';

const router = Router();

const MANUAL_TIMEOUT_MINUTES = 30;

function getState() {
  const state = db.prepare('SELECT * FROM pump_state WHERE id = 1').get() as any;

  // Cek manual timeout: kalau sudah lewat 30 menit, otomatis balik ke auto
  if (state.mode === 'manual' && state.manual_expires_at) {
    const expiresAt = new Date(state.manual_expires_at);
    if (new Date() > expiresAt) {
      db.prepare(`
        UPDATE pump_state 
        SET mode = 'auto', is_on = 0, manual_expires_at = NULL, last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run();

      db.prepare(`INSERT INTO logs (event, trigger) VALUES ('off', 'timeout')`).run();

      return db.prepare('SELECT * FROM pump_state WHERE id = 1').get();
    }
  }

  return state;
}

// GET /api/status
router.get('/status', requireAuth, (_req: Request, res: Response): void => {
  const state = getState() as any;

  const isDeviceOnline = state.last_heartbeat
    ? (Date.now() - new Date(state.last_heartbeat).getTime()) < 2 * 60 * 1000
    : false;

  res.json({
    isOn: Boolean(state.is_on),
    mode: state.mode,
    lastUpdated: state.last_updated,
    lastHeartbeat: state.last_heartbeat,
    deviceOnline: isDeviceOnline,
    manualExpiresAt: state.manual_expires_at,
  });
});

// POST /api/pump/on
router.post('/pump/on', requireAuth, (_req: Request, res: Response): void => {
  const expiresAt = new Date(Date.now() + MANUAL_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE pump_state 
    SET is_on = 1, mode = 'manual', manual_expires_at = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(expiresAt);

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('on', 'manual')`).run();

  res.json({ message: 'Pompa dinyalakan', expiresAt });
});

// POST /api/pump/off
router.post('/pump/off', requireAuth, (_req: Request, res: Response): void => {
  db.prepare(`
    UPDATE pump_state 
    SET is_on = 0, mode = 'manual', manual_expires_at = NULL, last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('off', 'manual')`).run();

  res.json({ message: 'Pompa dimatikan' });
});

// POST /api/mode/auto - release manual, kembali ke auto
router.post('/mode/auto', requireAuth, (_req: Request, res: Response): void => {
  db.prepare(`
    UPDATE pump_state 
    SET mode = 'auto', is_on = 0, manual_expires_at = NULL, last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('off', 'system')`).run();

  res.json({ message: 'Mode dikembalikan ke auto' });
});

export { getState };
export default router;
