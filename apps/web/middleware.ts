import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? 'fallback');

const authRoutes = ['/login', '/register'];
const adminRoutes = ['/admin'];
const engineerRoutes = ['/engineer'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('access_token')?.value;

  let payload: Record<string, unknown> | null = null;

  if (token) {
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as Record<string, unknown>;
    } catch {
      // Token invalid/expired
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some((r) => pathname.startsWith(r)) && payload) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protect dashboard routes — must be SUPPLIER or ADMIN
  if (pathname.startsWith('/dashboard')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (payload.role !== 'SUPPLIER' && payload.role !== 'SUPER_SUPPLIER' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect admin routes
  if (adminRoutes.some((r) => pathname.startsWith(r))) {
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect engineer routes
  if (engineerRoutes.some((r) => pathname.startsWith(r))) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (payload.role !== 'AGRI_ENGINEER' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect account routes
  if (pathname.startsWith('/account') && !payload) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Protect checkout
  if (pathname.startsWith('/cart/checkout') && !payload) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/engineer/:path*',
    '/account/:path*',
    '/cart/checkout',
    '/login',
    '/register',
  ],
};