import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// POST /api/auth/register
// Creates an Association and an admin User in a single transaction
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { associationName, associationNameAr, email, password, adminName, adminNameAr } = req.body;

    if (!associationName || !associationNameAr || !email || !password || !adminName || !adminNameAr) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Check uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

    // Atomic transaction: create Association + admin User
    const result = await prisma.$transaction(async (tx) => {
      const association = await tx.association.create({
        data: {
          name: associationName,
          nameAr: associationNameAr,
          email,
          password: hashedPassword,
        },
      });

      const user = await tx.user.create({
        data: {
          associationId: association.id,
          email,
          password: hashedPassword,
          name: adminName,
          nameAr: adminNameAr,
          role: 'admin',
        },
      });

      return { association, user };
    });

    const accessToken = generateAccessToken({
      userId: result.user.id,
      associationId: result.association.id,
      role: result.user.role,
    });

    const refreshToken = generateRefreshToken({ userId: result.user.id });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        nameAr: result.user.nameAr,
        role: result.user.role,
        associationId: result.user.associationId,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      associationId: user.associationId,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nameAr: user.nameAr,
        role: user.role,
        associationId: user.associationId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
// Verifies the refresh token and issues a new token pair
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    // Verify against the refresh secret (not the access secret)
    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      associationId: user.associationId,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({ userId: user.id });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
// Protected — returns current user and association info
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        role: true,
        associationId: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const association = await prisma.association.findUnique({
      where: { id: user.associationId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        email: true,
        createdAt: true,
      },
    });

    res.json({ user, association });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
// Protected — stateless JWT, just returns success
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  // Optionally accept refreshToken in body for client-side cleanup
  res.json({ message: 'Logged out successfully' });
});

export default router;
