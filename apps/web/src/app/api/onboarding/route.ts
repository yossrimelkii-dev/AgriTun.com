export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, OnboardingRequest } from '@agrimed/db';
import { z } from 'zod';
import { normalizePhone } from '@/lib/notifications/approval';

const onboardingSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    professional: z.enum(['AGRICULTEUR', 'FOURNISSEUR', 'SPECIALIST', 'CENTRE_DE_FORMATION']),
    phoneNumber: z.string().min(1).max(30),
    companyName: z.string().max(255).optional(),
    email: z.string().email().max(255).optional().or(z.literal('')),
    location: z.string().max(300).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.professional !== 'AGRICULTEUR' && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'Le nom de la société est obligatoire pour ce profil professionnel',
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, professional, phoneNumber, companyName, email, location } = parsed.data;
    const normalizedPhone = normalizePhone(phoneNumber) || phoneNumber.trim();

    const request = await OnboardingRequest.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      professional,
      phoneNumber: normalizedPhone,
      companyName: companyName?.trim() || undefined,
      email: email?.trim() || undefined,
      location: location?.trim() || undefined,
      status: 'PENDING',
    });

    return NextResponse.json(
      {
        onboardingRequest: {
          id: request._id.toString(),
          professional: request.professional,
          status: request.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboarding creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
