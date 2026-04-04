import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/stripe/server';
import { updateBookingStatus, updateBookingBySessionId, getBooking } from '@/lib/bookings-store';
import {
  updateBookingInSupabase,
  updateBookingBySessionInSupabase,
} from '@/lib/supabase/bookings';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; data: { object: any } };
  try {
    event = await handleWebhookEvent(body, sig);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string };
          payment_intent?: string;
        };
        const paymentIntentId = session.payment_intent as string | undefined;
        const bookingId = session.metadata?.bookingId || session.metadata?.booking_id;
        if (bookingId) {
          updateBookingStatus(bookingId, 'confirmed', { payment_intent_id: paymentIntentId });
          await updateBookingInSupabase(bookingId, 'confirmed', {
            stripe_payment_intent_id: paymentIntentId,
          });
        } else if (session.id) {
          updateBookingBySessionId(session.id, 'confirmed', { payment_intent_id: paymentIntentId });
          await updateBookingBySessionInSupabase(session.id, 'confirmed', {
            stripe_payment_intent_id: paymentIntentId,
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = session.metadata?.bookingId || session.metadata?.booking_id;
        if (bookingId) {
          const booking = getBooking(bookingId);
          if (booking?.status === 'pending') {
            updateBookingStatus(bookingId, 'cancelled');
            await updateBookingInSupabase(bookingId, 'cancelled');
          }
        } else if (session.id) {
          updateBookingBySessionId(session.id, 'cancelled');
          await updateBookingBySessionInSupabase(session.id, 'cancelled');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = pi.metadata?.bookingId || pi.metadata?.booking_id;
        if (bookingId) {
          updateBookingStatus(bookingId, 'confirmed', { payment_intent_id: pi.id });
          await updateBookingInSupabase(bookingId, 'confirmed', {
            stripe_payment_intent_id: pi.id,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as {
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = pi.metadata?.bookingId || pi.metadata?.booking_id;
        if (bookingId) {
          updateBookingStatus(bookingId, 'cancelled');
          await updateBookingInSupabase(bookingId, 'cancelled');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as {
          metadata?: { bookingId?: string; booking_id?: string };
          payment_intent?: string;
        };
        const bookingId = charge.metadata?.bookingId || charge.metadata?.booking_id;
        if (bookingId) {
          updateBookingStatus(bookingId, 'cancelled');
          await updateBookingInSupabase(bookingId, 'cancelled');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
