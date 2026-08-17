import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../db';

const router = Router();

// GET /api/logs?page=1&limit=50
router.get('/', requireAuth, (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const rows = db.prepare(
    'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  const total = (db.prepare('SELECT COUNT(*) as count FROM logs').get() as any).count;

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
