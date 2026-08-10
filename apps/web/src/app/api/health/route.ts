export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

// Lightweight liveness probe used by Docker / uptime monitors.
// Deliberately does NOT touch the database — returns 200 as long as the
// Node process is alive and the Next server is accepting requests. That's
// exactly what "liveness" means; if you also want a readiness probe that
// verifies Mongo, ping /api/categories?parentId=root instead.
export function GET() {
  return NextResponse.json(
    { status: 'ok', uptime: process.uptime() },
    { status: 200 }
  );
}
