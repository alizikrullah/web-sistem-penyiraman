import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid atau expired' });
  }
}

export function requireDevice(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-device-key'];

  if (!key || key !== process.env.DEVICE_API_KEY) {
    res.status(401).json({ error: 'Device key invalid' });
    return;
  }

  next();
}
