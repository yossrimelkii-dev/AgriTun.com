export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' });

  response.cookies.set('access_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/' });

  return response;
}
