import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { config } from '../config';

const router = Router();

// POST /api/auth/google — authenticate with Google token
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, inviteToken } = req.body;

    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    // Verify Google token
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const googleEmail = payload.email;
    const googleName = payload.name || '';
    const googlePicture = payload.picture || '';
    // Extract first/last name from display name
    const nameParts = googleName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
    });

    // New user: process invite token if provided
    if (!user) {
      if (inviteToken) {
        // Invite flow: join existing association
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
        if (token.email !== googleEmail) {
          res.status(400).json({ error: 'البريد الإلكتروني لا يتطابق مع رمز الدعوة' });
          return;
        }

        const result = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              associationId: token.associationId,
              email: googleEmail,
              password: '', // No password — Google OAuth user
              name: token.name || `${firstName} ${lastName}` || googleName,
              nameAr: token.nameAr || `${firstName} ${lastName}` || googleName,
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
        // No invite — create a new association (first-time Google sign-in)
        const association = await prisma.$transaction(async (tx) => {
          const assoc = await tx.association.create({
            data: {
              name: googleName,
              nameAr: googleName,
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

          return { association: assoc, user: newUser };
        });

        user = association.user;
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
