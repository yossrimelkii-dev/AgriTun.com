export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, OnboardingRequest, User } from '@agrimed/db';
import { requireRole } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateTemporaryPassword, mapProfessionalToRole, sendApprovalEmail, sendApprovalSms, normalizePhone } from '@/lib/notifications/approval';
import { Types } from 'mongoose';

const approvalSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  professional: z.enum(['AGRICULTEUR', 'FOURNISSEUR', 'SPECIALIST', 'CENTRE_DE_FORMATION']),
  phoneNumber: z.string().min(1).max(30),
  companyName: z.string().max(255).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  location: z.string().max(300).optional().or(z.literal('')),
  passwordMode: z.enum(['AUTO', 'MANUAL']),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.professional !== 'AGRICULTEUR' && !data.companyName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['companyName'],
      message: 'Le nom de la société est obligatoire pour ce profil professionnel',
    });
  }
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const admin = await requireRole('ADMIN');
    const { id } = params;

    const body = await req.json();
    const parsed = approvalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const request = await OnboardingRequest.findById(id);
    if (!request) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (request.status === 'APPROVED' && request.userId) {
      return NextResponse.json({ error: 'Demande déjà approuvée' }, { status: 409 });
    }

    const role = mapProfessionalToRole(parsed.data.professional);
    const password = parsed.data.passwordMode === 'AUTO' ? generateTemporaryPassword(12) : parsed.data.password?.trim();
    const providedEmail = parsed.data.email?.trim();
    const normalizedPhone = normalizePhone(parsed.data.phoneNumber) || parsed.data.phoneNumber.trim();
    const generatedEmail = `onboarding-${normalizedPhone.replace(/\D/g, '') || id.slice(0, 8)}@agritun.local`;
    const loginEmail = providedEmail || generatedEmail;

    if (!password) {
      return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.findOneAndUpdate(
      { email: loginEmail.toLowerCase() },
      {
        $set: {
          email: loginEmail.toLowerCase(),
          passwordHash,
          role,
          badge: { type: 'FREE', isActive: false },
          profile: {
            firstName: parsed.data.firstName.trim(),
            lastName: parsed.data.lastName.trim(),
            phone: normalizedPhone,
            companyName: parsed.data.companyName?.trim() || undefined,
            location: parsed.data.location?.trim() || undefined,
          },
          isEmailVerified: true,
        },
      },
      { upsert: true, new: true }
    );

    request.status = 'APPROVED';
    request.userId = user._id;
    request.reviewedBy = new Types.ObjectId(admin.userId);
    request.reviewedAt = new Date();
    request.adminNote = 'Approved from admin onboarding dashboard';
    await request.save();

    const notificationTasks: Promise<unknown>[] = [];

    if (providedEmail) {
      notificationTasks.push(
        sendApprovalEmail({
          to: providedEmail,
          firstName: parsed.data.firstName.trim(),
          lastName: parsed.data.lastName.trim(),
          loginEmail,
          temporaryPassword: password,
        })
      );
    }

    notificationTasks.push(
      sendApprovalSms({
        to: normalizedPhone,
        firstName: parsed.data.firstName.trim(),
        temporaryPassword: password,
        loginEmail,
      })
    );

    const results = await Promise.allSettled(notificationTasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.warn('[approval] Notification send failed:', result.reason);
      }
    });

    return NextResponse.json({
      success: true,
      userId: user._id.toString(),
      loginEmail,
      temporaryPassword: parsed.data.passwordMode === 'AUTO' ? password : undefined,
    });
  } catch (error: any) {
    if (error?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin onboarding approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
