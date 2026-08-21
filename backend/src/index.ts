import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import pumpRoutes from './routes/pump';
import schedulesRoutes from './routes/schedules';
import logsRoutes from './routes/logs';
import deviceRoutes from './routes/device';
import sensorRoutes from './routes/sensor';
import plantsRoutes from './routes/plants';
import notificationsRoutes from './routes/notifications';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api', pumpRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api', sensorRoutes);
app.use('/api', plantsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', chatRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
});