import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Admin routes: require admin token (cookie or x-admin-token header)
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Server misconfiguration: ADMIN_PASSWORD not set' },
        { status: 500 },
      );
    }

    const cookieToken = request.cookies.get('admin_token')?.value;
    const headerToken = request.headers.get('x-admin-token');

    if (cookieToken !== adminPassword && headerToken !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized — admin token required' },
        { status: 401 },
      );
    }
  }

  // Booking detail routes: require authenticated user OR admin token
  const bookingDetailMatch = request.nextUrl.pathname.match(
    /^\/api\/bookings\/([^/]+)$/,
  );
  if (bookingDetailMatch) {
    const id = bookingDetailMatch[1];
    // Skip protection for the /api/bookings/mine route (handled by its own auth)
    if (id !== 'mine') {
      const adminPassword = process.env.ADMIN_PASSWORD;
      const cookieToken = request.cookies.get('admin_token')?.value;
      const headerToken = request.headers.get('x-admin-token');
      const isAdmin =
        adminPassword &&
        (cookieToken === adminPassword || headerToken === adminPassword);

      if (!isAdmin) {
        // Check for Supabase session
        const { user } = await updateSession(request);
        if (!user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 },
          );
        }
      }
    }
  }

  // Refresh Supabase session cookies for all matched routes
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/bookings/:path*'],
};
