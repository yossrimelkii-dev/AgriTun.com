export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User } from '@agrimed/db/models';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, buildJWTPayload } from '@/lib/auth/tokens';
import { z } from 'zod';

const registerSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phoneNumber: z.string().min(1).max(20),
    role: z.enum(['BUYER', 'SUPPLIER', 'AGRI_ENGINEER', 'TRAINING_CENTER']).default('BUYER'),
    speciality: z.string().max(160).optional(),
    companyName: z.string().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'AGRI_ENGINEER' && !data.speciality?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['speciality'],
        message: 'La spécialité est obligatoire pour un ingénieur agronome',
      });
    }
    if (data.role === 'SUPPLIER' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'Le nom de la société est obligatoire pour un fournisseur',
      });
    }
    if (data.role === 'TRAINING_CENTER' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'Le nom de la société est obligatoire pour un centre de formation',
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phoneNumber, role, speciality, companyName } = parsed.data;

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      passwordHash,
      role,
      badge: { type: 'FREE', isActive: false },
      profile: {
        firstName,
        lastName,
        phone: phoneNumber,
        speciality: role === 'AGRI_ENGINEER' ? speciality?.trim() : undefined,
        companyName: (role === 'SUPPLIER' || role === 'TRAINING_CENTER') ? companyName?.trim() : undefined,
      },
      isEmailVerified: false,
    });

    const jwtPayload = buildJWTPayload(user);
    const accessToken = await signAccessToken(jwtPayload);
    const refreshToken = await signRefreshToken({ userId: user._id.toString() });

    const response = NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          profile: user.profile,
          badge: user.badge,
        },
      },
      { status: 201 }
    );

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 min
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
