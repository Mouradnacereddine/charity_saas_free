import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { config } from '../config';

const router = Router();

// POST /api/auth/google — authenticate with Google token
// mode: 'login' → only if user exists, 'register' → create new association
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, inviteToken, mode, associationName, associationNameAr } = req.body;

    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    // Verify Google token using Google's tokeninfo endpoint
    let payload: any;
    try {
      const verifyRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { method: 'GET' }
      );
      if (!verifyRes.ok) {
        const errText = await verifyRes.text().catch(() => '');
        console.error('Google tokeninfo rejected:', verifyRes.status, errText);
        res.status(400).json({ error: 'رمز Google غير صالح' });
        return;
      }
      payload = await verifyRes.json();
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr);
      res.status(400).json({ error: 'فشل التحقق من رمز Google' });
      return;
    }

    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token payload' });
      return;
    }

    // Verify the token is meant for our app
    if (payload.aud !== config.googleClientId) {
      res.status(400).json({ error: 'Token audience mismatch' });
      return;
    }

    const googleEmail = payload.email;
    const googleName = payload.name || payload.email || '';
    const googlePicture = payload.picture || '';

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
    });

    // Mode validation
    const authMode = mode || 'login';

    // If user doesn't exist and mode is 'login' → error (must register first)
    if (!user && authMode === 'login' && !inviteToken) {
      res.status(404).json({ error: 'لا يوجد حساب بهذا البريد الإلكتروني. الرجاء إنشاء حساب جديد أولاً.' });
      return;
    }

    // New user: process invite token or create association
    if (!user) {
      if (inviteToken) {
        // Invite flow: always allowed regardless of mode
        const token = await prisma.inviteToken.findUnique({
          where: { token: inviteToken },
        });

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

        const result = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              associationId: token.associationId,
              email: googleEmail,
              password: '',
              name: token.name || googleName,
              nameAr: token.nameAr || googleName,
              role: token.role,
              status: 'approved',
            },
          });

          await tx.inviteToken.update({
            where: { id: token.id },
            data: { usedAt: new Date() },
          });

          return newUser;
        });

        user = result;
      } else {
        // mode is 'register' (or no mode but user didn't exist) — create new association
        const assocResult = await prisma.$transaction(async (tx) => {
          const assocName = associationName || googleName;
          const assocNameAr = associationNameAr || associationName || googleName;

          const assoc = await tx.association.create({
            data: {
              name: assocName,
              nameAr: assocNameAr,
              email: googleEmail,
              password: '',
            },
          });

          const newUser = await tx.user.create({
            data: {
              associationId: assoc.id,
              email: googleEmail,
              password: '',
              name: googleName,
              nameAr: googleName,
              role: 'admin',
            },
          });

          return newUser;
        });

        user = assocResult;
      }
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      associationId: user.associationId,
      role: user.role,
    });

    const refreshTokenVal = generateRefreshToken({ userId: user.id });

    res.json({
      accessToken,
      refreshToken: refreshTokenVal,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nameAr: user.nameAr,
        role: user.role,
        associationId: user.associationId,
        picture: googlePicture,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

export default router;
