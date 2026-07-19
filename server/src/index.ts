import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import authRoutes from './routes/auth';
import beneficiariesRoutes from './routes/beneficiaries';
import donorsRoutes from './routes/donors';
import caissesRoutes from './routes/caisses';
import financeRoutes from './routes/finance';
import inventoryRoutes from './routes/inventory';
import loansRoutes from './routes/loans';
import medicalRoutes from './routes/medical';
import dashboardRoutes from './routes/dashboard';
import notificationsRoutes from './routes/notifications';
import attributsRoutes from './routes/beneficiaryAttributs';
import googleRoutes from './routes/google';
import doctorsRoutes from './routes/doctors';

const app = express();

app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
const allowedOrigins = [
  config.frontendUrl,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o) || o.startsWith(origin))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', autoInvalidate, authRoutes);
app.use('/api/auth', autoInvalidate, googleRoutes);

// Serve uploaded files (for logos)
app.use('/uploads', express.static('public/uploads'));

// API routes — autoInvalidate middleware fires on POST/PUT/DELETE
import { autoInvalidate } from './lib/autoInvalidate';
app.use('/api/beneficiaries', autoInvalidate, beneficiariesRoutes);
app.use('/api/donors', autoInvalidate, donorsRoutes);
app.use('/api/caisses', autoInvalidate, caissesRoutes);
app.use('/api/finance', autoInvalidate, financeRoutes);
app.use('/api/inventory', autoInvalidate, inventoryRoutes);
app.use('/api/loans', autoInvalidate, loansRoutes);
app.use('/api/medical', autoInvalidate, medicalRoutes);
app.use('/api/doctors', autoInvalidate, doctorsRoutes);
app.use('/api/dashboard', autoInvalidate, dashboardRoutes);
app.use('/api/notifications', autoInvalidate, notificationsRoutes);
app.use('/api/beneficiary-attributs', autoInvalidate, attributsRoutes);

// Socket.IO — real-time sync
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  socket.on('join-association', (associationId: string) => {
    socket.join(`assoc:${associationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`⚡ Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);
import { setIO } from './lib/socket';
setIO(io);

// Only start the server when run directly (not as a Vercel serverless function)
if (!process.env.VERCEL) {
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { io };
export default app;
