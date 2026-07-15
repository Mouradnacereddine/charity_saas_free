import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import crypto from 'crypto';
const router = Router();

// ========================================================================
// PUBLIC AUTH
// ========================================================================

// POST /api/auth/register
// Creates an Association + admin User, OR joins via invite token
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { associationName, associationNameAr, email, password, adminName, adminNameAr, inviteToken } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // --- Invite code path: join existing association ---
    if (inviteToken) {
      const token = await prisma.inviteToken.findUnique({ where: { token: inviteToken } });

      if (!token) {
        res.status(400).json({ error: 'رمز الدعوة غير صالح' });
        return;
      }
      if (token.usedAt) {
        res.status(400).json({ error: 'رمز الدعوة مستخدم بالفعل' });
        return;
      }
      if (token.expiresAt < new Date()) {
        res.status(400).json({ error: 'رمز الدعوة منتهي الصلاحية' });
        return;
      }
      if (token.email !== email) {
        res.status(400).json({ error: 'البريد الإلكتروني لا يتطابق مع رمز الدعوة' });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            associationId: token.associationId,
            email,
            password: hashedPassword,
            name: adminName || token.name || '',
            nameAr: adminNameAr || token.nameAr || '',
            role: token.role,
            status: 'approved',
          },
        });

        await tx.inviteToken.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        });

        return user;
      });

      const accessToken = generateAccessToken({
        userId: result.id,
        associationId: token.associationId,
        role: result.role,
      });
      const refreshToken = generateRefreshToken({ userId: result.id });

      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          nameAr: result.nameAr,
          role: result.role,
          associationId: result.associationId,
        },
      });
      return;
    }

    // --- Original registration path: create new association ---
    if (!associationName || !associationNameAr || !adminName || !adminNameAr) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

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

    if (user.status !== 'approved') {
      res.status(403).json({ error: user.status === 'pending' ? 'حسابك قيد المراجعة، يرجى الانتظار حتى يتم الموافقة عليه' : 'تم رفض حسابك' });
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
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

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
        status: true,
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
        logoUrl: true,
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
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ message: 'Logged out successfully' });
});

// PUT /api/auth/association/logo — update association logo URL (admin only)
router.put('/association/logo', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { logoUrl } = req.body;
    const associationId = req.user!.associationId;

    if (!logoUrl || typeof logoUrl !== 'string') {
      res.status(400).json({ error: 'رابط الشعار مطلوب' });
      return;
    }

    const association = await prisma.association.update({
      where: { id: associationId },
      data: { logoUrl },
      select: { id: true, name: true, nameAr: true, email: true, logoUrl: true, createdAt: true },
    });

    res.json(association);
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// INVITE TOKENS
// ========================================================================

// POST /api/auth/invite — admin invites a person by email
router.post('/invite', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, role, name, nameAr } = req.body;
    const associationId = req.user!.associationId;

    if (!email) {
      res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      return;
    }

    const normalizedRole = role || 'user';
    if (normalizedRole === 'admin') {
      res.status(400).json({ error: 'لا يمكن دعوة مستخدم كمدير' });
      return;
    }
    if (!['user', 'treasurer'].includes(normalizedRole)) {
      res.status(400).json({ error: 'دور غير صالح' });
      return;
    }

    // Check user not already registered in this association
    const existingUser = await prisma.user.findFirst({
      where: { email, associationId },
    });
    if (existingUser) {
      res.status(409).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل في الجمعية' });
      return;
    }

    // Check for existing pending invite for this email
    const existingInvite = await prisma.inviteToken.findFirst({
      where: { email, associationId, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      res.status(409).json({ error: 'رمز دعوة معلق موجود بالفعل لهذا البريد' });
      return;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.inviteTokenExpiryDays);

    const invite = await prisma.inviteToken.create({
      data: {
        associationId,
        email,
        token,
        role: normalizedRole as any,
        name: name || '',
        nameAr: nameAr || '',
        expiresAt,
      },
    });

    const inviteLink = `${config.frontendUrl}/#register?invite=${invite.token}`;

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      inviteLink,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/invites — list invites (admin only)
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/invites — list invites (admin only)
router.get('/invites', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const invites = await prisma.inviteToken.findMany({
      where: { associationId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        nameAr: true,
        token: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const result = invites.map((inv) => ({
      ...inv,
      inviteLink: inv.usedAt ? null : `${config.frontendUrl}/#register?invite=${inv.token}`,
      isExpired: !inv.usedAt && inv.expiresAt < now,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/invites/:id — cancel an invite
router.delete('/invites/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const invite = await prisma.inviteToken.findFirst({
      where: { id, associationId },
    });

    if (!invite) {
      res.status(404).json({ error: 'الدعوة غير موجودة' });
      return;
    }

    await prisma.inviteToken.delete({ where: { id } });
    res.json({ message: 'تم إلغاء الدعوة' });
  } catch (error) {
    console.error('Error deleting invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/invite/:token — public lookup of invite details
router.get('/invite/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        association: { select: { name: true, nameAr: true } },
      },
    });

    if (!invite) {
      res.status(404).json({ error: 'رمز الدعوة غير صالح' });
      return;
    }
    if (invite.usedAt) {
      res.status(400).json({ error: 'رمز الدعوة مستخدم بالفعل' });
      return;
    }
    if (invite.expiresAt < new Date()) {
      res.status(400).json({ error: 'رمز الدعوة منتهي الصلاحية' });
      return;
    }

    res.json({
      email: invite.email,
      role: invite.role,
      name: invite.name,
      nameAr: invite.nameAr,
      associationName: invite.association.name,
      associationNameAr: invite.association.nameAr,
    });
  } catch (error) {
    console.error('Error looking up invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================================================
// USER MANAGEMENT (admin only)
// ========================================================================

// POST /api/auth/users/create — admin creates a user directly
router.post('/users/create', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, nameAr, role } = req.body;
    const associationId = req.user!.associationId;

    if (!email || !password || !nameAr) {
      res.status(400).json({ error: 'البريد الإلكتروني، كلمة المرور، والاسم بالعربية مطلوبون' });
      return;
    }

    const normalizedRole = role || 'user';
    if (!['user', 'treasurer'].includes(normalizedRole)) {
      res.status(400).json({ error: 'دور غير صالح' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        associationId,
        email,
        password: hashedPassword,
        name: name || nameAr,
        nameAr,
        role: normalizedRole as any,
        status: 'approved',
      },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/users — list all users for this association
router.get('/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const associationId = req.user!.associationId;

    const users = await prisma.user.findMany({
      where: { associationId },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/users/:id — update user (status, role)
router.put('/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.user.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { status, role } = req.body;
    const data: any = {};

    // Prevent self-demotion
    if (id === req.user!.userId && role !== undefined && role !== existing.role) {
      res.status(400).json({ error: 'لا يمكنك تغيير دورك الخاص' });
      return;
    }

    if (status !== undefined) data.status = status;
    if (role !== undefined) data.role = role;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        role: true,
        status: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/users/:id — remove a user
router.delete('/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const associationId = req.user!.associationId;

    const existing = await prisma.user.findFirst({
      where: { id, associationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
