import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet } from '../directus';

const router = Router();

// GET /api/logs?page=1&limit=50
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const result = await dGet('/items/logs', {
      sort: '-timestamp',
      limit: String(limit),
      page: String(page),
      meta: 'total_count',
    });

    const total = result.meta?.total_count || 0;
    res.json({
      data: result.data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ error: 'Gagal ambil logs' });
  }
});

export default router;
