import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username dan password wajib diisi' });
    return;
  }

  const validUsername = username === process.env.ADMIN_USERNAME;
  const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH as string);

  if (!validUsername || !validPassword) {
    res.status(401).json({ error: 'Username atau password salah' });
    return;
  }

  const token = jwt.sign(
    { username },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ message: 'Login berhasil' });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logout berhasil' });
});

// GET /api/auth/me - cek apakah session masih valid
router.get('/me', (req: Request, res: Response): void => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ authenticated: false });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    res.json({ authenticated: true, user: payload });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
