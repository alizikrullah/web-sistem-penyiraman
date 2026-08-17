import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import db from '../db';

const router = Router();

// GET /api/schedules
router.get('/', requireAuth, (_req: Request, res: Response): void => {
  const rows = db.prepare('SELECT * FROM schedules ORDER BY start_time ASC').all();
  const schedules = rows.map((s: any) => ({
    ...s,
    days: JSON.parse(s.days),
    isActive: Boolean(s.is_active),
  }));
  res.json(schedules);
});

// POST /api/schedules
router.post('/', requireAuth, (req: Request, res: Response): void => {
  const { label, days, startTime, durationMinutes } = req.body;

  if (!label || !days || !startTime || !durationMinutes) {
    res.status(400).json({ error: 'Semua field wajib diisi' });
    return;
  }

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: 'Days harus array dan tidak boleh kosong' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO schedules (label, days, start_time, duration_minutes)
    VALUES (?, ?, ?, ?)
  `).run(label, JSON.stringify(days), startTime, durationMinutes);

  const created = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...created, days: JSON.parse(created.days), isActive: Boolean(created.is_active) });
});

// PUT /api/schedules/:id
router.put('/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { label, days, startTime, durationMinutes, isActive } = req.body;

  const existing = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    return;
  }

  db.prepare(`
    UPDATE schedules 
    SET label = ?, days = ?, start_time = ?, duration_minutes = ?, is_active = ?
    WHERE id = ?
  `).run(label, JSON.stringify(days), startTime, durationMinutes, isActive ? 1 : 0, id);

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
  res.json({ ...updated, days: JSON.parse(updated.days), isActive: Boolean(updated.is_active) });
});

// DELETE /api/schedules/:id
router.delete('/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    return;
  }

  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  res.json({ message: 'Jadwal dihapus' });
});

export default router;
