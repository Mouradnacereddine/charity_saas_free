import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// API routes
app.use('/api/beneficiaries', beneficiariesRoutes);
app.use('/api/donors', donorsRoutes);
app.use('/api/caisses', caissesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/beneficiary-attributs', attributsRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
