import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { getBooking, updateBookingStatus } from '@/lib/bookings-store';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { bookingId, successUrl, cancelUrl } = body as {
    bookingId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  const booking = getBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';

  try {
    const session = await createCheckoutSession({
      bookingId,
      listingTitle: booking.listing_name,
      amountUsd: booking.total_usd,
      touristEmail: booking.guest_email,
      successUrl: successUrl || `${appUrl}/booking/confirmation?id=${bookingId}`,
      cancelUrl:
        cancelUrl ||
        (booking.listing_slug ? `${appUrl}/listing/${booking.listing_slug}` : `${appUrl}/`),
      metadata: { bookingId },
    });

    updateBookingStatus(bookingId, 'pending', {
      stripe_checkout_session_id: session.id,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
