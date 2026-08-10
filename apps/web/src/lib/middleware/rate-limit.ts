import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter for API routes
// For production, use Redis-based rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS: Record<string, number> = {
  '/api/auth/login': 10,
  '/api/auth/register': 5,
  '/api/orders': 20,
  '/api/search': 60,
  default: 100,
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (value.resetAt < now) rateLimitMap.delete(key);
  }
}, 60_000);

export function rateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown';

  const path = new URL(req.url).pathname;
  const limit = MAX_REQUESTS[path] || MAX_REQUESTS.default;
  const key = `${ip}:${path}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;

  if (entry.count > limit!) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
