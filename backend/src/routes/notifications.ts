import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPatch, dPost } from '../directus';

const router = Router();

// Helper — buat notifikasi kalau belum ada duplikat dalam window tertentu
export async function createNotificationIfNew(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'alert',
  dedupeWindowMinutes: number = 60
): Promise<void> {
  try {
    const since = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000).toISOString();
    const existing = await dGet('/items/notifications', {
      'filter[title][_eq]': title,
      'filter[is_read][_eq]': 'false',
      'filter[date_created][_gte]': since,
      'limit': '1',
    });
    if (existing.data?.length > 0) return;
    await dPost('/items/notifications', { title, message, type, is_read: false });
  } catch (e) {
    console.error('[NOTIF] Gagal buat notifikasi:', e);
  }
}

// GET /api/notifications/unread-count
router.get('/notifications/unread-count', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/notifications', {
      'filter[is_read][_eq]': 'false',
      'limit': '0',
      'meta': 'total_count',
    });
    res.json({ count: result.meta?.total_count ?? 0 });
  } catch {
    res.status(500).json({ error: 'Gagal ambil jumlah notifikasi' });
  }
});

// GET /api/notifications
router.get('/notifications', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await dGet('/items/notifications', {
      'sort': '-date_created',
      'limit': String(limit),
      'offset': String(offset),
      'meta': 'total_count',
    });

    const total = result.meta?.total_count ?? 0;
    res.json({
      data: result.data ?? [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ error: 'Gagal ambil notifikasi' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await dPatch(`/items/notifications/${req.params.id}`, { is_read: true });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal update notifikasi' });
  }
});

// POST /api/notifications/read-all
router.post('/notifications/read-all', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const unread = await dGet('/items/notifications', {
      'filter[is_read][_eq]': 'false',
      'fields': 'id',
      'limit': '1000',
    });
    if (unread.data?.length > 0) {
      await dPatch('/items/notifications', unread.data.map((n: any) => ({ id: n.id, is_read: true })));
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal update semua notifikasi' });
  }
});

export default router;