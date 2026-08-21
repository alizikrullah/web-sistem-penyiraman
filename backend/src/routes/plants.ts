import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { dGet, dPost, dPatch, dDelete } from '../directus';

const router = Router();

// === ROWS ===

router.get('/rows', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/rows', { sort: 'sort,name' });
    res.json(result.data ?? []);
  } catch {
    res.status(500).json({ error: 'Gagal ambil data baris' });
  }
});

router.post('/rows', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location, notes } = req.body;
    if (!name) { res.status(400).json({ error: 'Nama baris wajib diisi' }); return; }
    const result = await dPost('/items/rows', { name, location: location || null, notes: notes || null });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Gagal tambah baris' });
  }
});

router.put('/rows/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location, notes } = req.body;
    if (!name) { res.status(400).json({ error: 'Nama baris wajib diisi' }); return; }
    const result = await dPatch(`/items/rows/${req.params.id}`, { name, location: location || null, notes: notes || null });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Gagal update baris' });
  }
});

router.delete('/rows/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await dDelete(`/items/rows/${req.params.id}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal hapus baris' });
  }
});

// === PLANTS ===

router.get('/plants', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dGet('/items/plants', { fields: '*,row.id,row.name', sort: 'name' });
    res.json(result.data ?? []);
  } catch {
    res.status(500).json({ error: 'Gagal ambil data tanaman' });
  }
});

router.post('/plants', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, row, type, planted_at, notes } = req.body;
    if (!name || !row) { res.status(400).json({ error: 'Nama dan baris wajib diisi' }); return; }
    const result = await dPost('/items/plants', {
      name,
      row,
      type: type || null,
      planted_at: planted_at || null,
      notes: notes || null,
      status: 'published',
    });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Gagal tambah tanaman' });
  }
});

router.put('/plants/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, row, type, planted_at, notes } = req.body;
    if (!name || !row) { res.status(400).json({ error: 'Nama dan baris wajib diisi' }); return; }
    const result = await dPatch(`/items/plants/${req.params.id}`, {
      name,
      row,
      type: type || null,
      planted_at: planted_at || null,
      notes: notes || null,
    });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Gagal update tanaman' });
  }
});

router.delete('/plants/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await dDelete(`/items/plants/${req.params.id}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Gagal hapus tanaman' });
  }
});

export default router;