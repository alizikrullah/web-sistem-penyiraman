import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost, dPatch, dDelete } from '../directus';

const router = Router();

function mapSchedule(s: any) {
  return {
    id: s.id,
    label: s.label,
    days: s.days,
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
    durationSeconds: s.duration_seconds ?? 0,
    isActive: s.is_active,
    createdAt: s.date_created,
  };
}

// GET /api/schedules
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/schedules', { sort: 'start_time' });
    res.json(result.data.map(mapSchedule));
  } catch {
    res.status(500).json({ error: 'Gagal ambil jadwal' });
  }
});

// POST /api/schedules
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { label, days, startTime, durationMinutes, durationSeconds } = req.body;

  if (!label || !days || !startTime || durationMinutes === undefined) {
    res.status(400).json({ error: 'Semua field wajib diisi' });
    return;
  }
  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: 'Days harus array dan tidak boleh kosong' });
    return;
  }

  try {
    const result = await dPost('/items/schedules', {
      label,
      days,
      start_time: startTime,
      duration_minutes: durationMinutes,
      duration_seconds: durationSeconds ?? 0,
      is_active: true,
    });
    res.status(201).json(mapSchedule(result.data));
  } catch {
    res.status(500).json({ error: 'Gagal buat jadwal' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { label, days, startTime, durationMinutes, durationSeconds, isActive } = req.body;

  try {
    const result = await dPatch(`/items/schedules/${id}`, {
      label,
      days,
      start_time: startTime,
      duration_minutes: durationMinutes,
      duration_seconds: durationSeconds ?? 0,
      is_active: isActive,
    });
    res.json(mapSchedule(result.data));
  } catch {
    res.status(500).json({ error: 'Gagal update jadwal' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await dDelete(`/items/schedules/${id}`);
    res.json({ message: 'Jadwal dihapus' });
  } catch {
    res.status(500).json({ error: 'Gagal hapus jadwal' });
  }
});

export default router;