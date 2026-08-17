import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../db';

const router = Router();

function getState() {
  return db.prepare('SELECT * FROM pump_state WHERE id = 1').get() as any;
}

// GET /api/status
router.get('/status', requireAuth, (_req: Request, res: Response): void => {
  const state = getState();

  const isDeviceOnline = state.last_heartbeat
    ? (Date.now() - new Date(state.last_heartbeat).getTime()) < 2 * 60 * 1000
    : false;

  res.json({
    isOn: Boolean(state.is_on),
    mode: state.mode,
    lastUpdated: state.last_updated,
    lastHeartbeat: state.last_heartbeat,
    deviceOnline: isDeviceOnline,
  });
});

// POST /api/pump/on
router.post('/pump/on', requireAuth, (_req: Request, res: Response): void => {
  db.prepare(`
    UPDATE pump_state 
    SET is_on = 1, mode = 'manual', last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('on', 'manual')`).run();
  res.json({ message: 'Pompa dinyalakan' });
});

// POST /api/pump/off
router.post('/pump/off', requireAuth, (_req: Request, res: Response): void => {
  db.prepare(`
    UPDATE pump_state 
    SET is_on = 0, mode = 'manual', last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('off', 'manual')`).run();
  res.json({ message: 'Pompa dimatikan' });
});

// POST /api/mode/auto
router.post('/mode/auto', requireAuth, (_req: Request, res: Response): void => {
  db.prepare(`
    UPDATE pump_state 
    SET mode = 'auto', is_on = 0, last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  db.prepare(`INSERT INTO logs (event, trigger) VALUES ('off', 'system')`).run();
  res.json({ message: 'Mode dikembalikan ke auto' });
});

export { getState };
export default router;