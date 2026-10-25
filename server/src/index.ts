import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { autoInvalidate } from './lib/autoInvalidate';
import { roundMoney } from './lib/money';
import { Prisma } from './generated/prisma/client';

// Patch Decimal.prototype.toJSON so Decimal values serialize as numbers in JSON,
// not as strings. Prisma Decimal uses decimal.js internally; its default toJSON
// returns a string that loses the numeric type on the client.
// On arrondit au centime à la sérialisation : c'est un contrat d'AFFICHAGE
// (2 décimales pour DZD). La source de vérité reste la colonne Decimal — mais
// comme Prisma n'arrondit jamais un nombre JS flottant à l'écriture, tous les
// montants doivent en plus être normalisés via roundMoney AVANT persistance
// (voir src/lib/money.ts) : c'est là que se corrige la « perte de centimes ».
const OrigDecimal = Prisma.Decimal.prototype as any;
OrigDecimal.toJSON = function (this: any) {
  return roundMoney(Number(this));
};
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
import doctorsRoutes from './routes/doctors';
import auditRoutes from './routes/audit';
import lemonSqueezyRoutes from './routes/lemonSqueezy';

const app = express();

// Derrière le proxy Vercel, `req.ip` vaut l'adresse du proxy sans ce réglage :
// les logs et le rate limiting ci-dessous porteraient alors sur une IP unique.
// `1` (un seul saut de confiance) et non `true`, qui accepterait n'importe quel
// X-Forwarded-For fourni par le client.
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  // L'API ne renvoie que du JSON : une CSP verrouillée y est sans coût et
  // couvre le cas où une réponse serait interprétée comme du document. La CSP
  // de la page HTML elle-même est posée par `vercel.json` (fichier servi en
  // statique, hors de portée d'Express).
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
}));
const allowedOrigins = [
  config.frontendUrl,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
];
app.use(cors({
  // Les deux branches acceptaient l'origine : la liste blanche ne filtrait rien.
  // Le test `origin.startsWith(o)` était en plus un match de préfixe
  // (`http://localhost:5173.evil.com` passait). Comparaison stricte désormais.
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
// Raw body pour le webhook LemonSqueezy (vérification signature HMAC) —
// doit être monté AVANT express.json() pour capturer le corps brut.
app.use('/api/lemon-squeezy/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
// Throttling sur l'authentification : sans limite, `/login` autorisait le brute
// force en ligne, et chaque essai coûte un bcrypt (coût 10) côté serveur — donc
// un vecteur de déni de service en plus de l'énumération de comptes.
// 10 tentatives / 15 min par IP sur les routes sensibles.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'عدد كبير من المحاولات. يرجى المحاولة لاحقاً.' },
  // En développement, ne pas bloquer les tests manuels répétés.
  skip: () => process.env.NODE_ENV !== 'production' && !process.env.VERCEL,
});

// Limiteur plus large pour les lectures authentifiées de `/auth` (ex. `/me`,
// appelé à chaque chargement de page) : seule l'écriture doit être bridée.
const authReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production' && !process.env.VERCEL,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/invite', authReadLimiter);
app.use('/api/auth', autoInvalidate, authRoutes);

// Serve uploaded files (for logos)
app.use('/uploads', express.static('public/uploads'));

// API routes
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
app.use('/api/audit', auditRoutes);
app.use('/api/lemon-squeezy', lemonSqueezyRoutes);

// Socket.IO — only in non-serverless mode (require inside the block so it doesn't fail on Vercel)
if (!process.env.VERCEL) {
  const http = require('http');
  const { Server: SocketIOServer } = require('socket.io');
  const { setIO } = require('./lib/socket');
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Handshake authentifié. Sans `io.use`, n'importe quel client anonyme pouvait
  // émettre `join-association` avec l'UUID d'une AUTRE association et recevoir
  // tous ses événements `invalidate` (cartographie d'activité inter-tenant).
  // L'association est désormais dérivée du jeton, jamais du client.
  const { verifyToken } = require('./lib/jwt');
  const prismaClient = require('./lib/prisma').default;

  io.use(async (socket: any, next: any) => {
    try {
      const token =
        socket.handshake?.auth?.token ||
        (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('UNAUTHORIZED'));

      const payload = verifyToken(token);
      // Même rigueur que `requireAuth` : le jeton ne fait pas autorité, on relit
      // le compte (statut, association) et on refuse par défaut en cas d'échec.
      const compte = await prismaClient.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, associationId: true, status: true },
      });
      if (!compte || compte.status !== 'approved') return next(new Error('UNAUTHORIZED'));

      socket.data.associationId = compte.associationId;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: any) => {
    console.log(`⚡ Socket connected: ${socket.id}`);
    // La room est imposée par le serveur, à partir de l'association relue en
    // base. `join-association` reste écouté pour ne pas casser les clients
    // déployés, mais son argument est ignoré.
    socket.join(`assoc:${socket.data.associationId}`);
    socket.on('join-association', () => {
      socket.join(`assoc:${socket.data.associationId}`);
    });
    socket.on('disconnect', () => {
      console.log(`⚡ Socket disconnected: ${socket.id}`);
    });
  });

  app.set('io', io);
  setIO(io);

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export default app;
