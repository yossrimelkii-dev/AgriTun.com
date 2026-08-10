export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@agrimed/db';
import { User, Supplier } from '@agrimed/db/models';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@agrimed/types';
import { signAccessToken, signRefreshToken, buildJWTPayload } from '@/lib/auth/tokens';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // select('+passwordHash') to explicitly include the field
    const user = await User.findOne({ email }).select('+passwordHash').lean();
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // If supplier, supplier_prime, or super_supplier, fetch supplierId
    let supplierId: string | undefined;
    if (user.role === 'SUPPLIER' || user.role === 'SUPPLIER_PRIME' || user.role === 'SUPER_SUPPLIER') {
      const supplier = await Supplier.findOne({ userId: user._id }).select('_id').lean();
      supplierId = supplier?._id?.toString();
    }

    const jwtPayload = buildJWTPayload({ ...user, supplierId });
    const accessToken = await signAccessToken(jwtPayload);
    const refreshToken = await signRefreshToken({ userId: user._id.toString() });

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        profile: user.profile,
        badge: user.badge,
        supplierId,
      },
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
