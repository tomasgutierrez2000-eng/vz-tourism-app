/**
 * Supabase booking operations using the service role key (bypasses RLS).
 * Used for server-side booking writes from API routes.
 *
 * Supabase bookings table columns:
 *   id, listing_id, tourist_id, provider_id, status, check_in, check_out,
 *   guests, total_usd, platform_fee_usd, provider_amount_usd,
 *   stripe_payment_intent_id, stripe_checkout_session_id,
 *   notes, special_requests, cancellation_reason, refund_amount_usd,
 *   confirmed_at, cancelled_at, completed_at, created_at, updated_at
 */

import { createClient } from '@supabase/supabase-js';
import type { LocalBooking, BookingStatus } from '@/lib/bookings-store';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Map our LocalBooking fields to the Supabase bookings schema */
function toSupabaseRow(booking: LocalBooking, touristId?: string | null) {
  return {
    id: booking.id,
    listing_id: booking.listing_id,
    tourist_id: touristId ?? null,
    provider_id: booking.provider_id ?? null,
    status: booking.status,
    check_in: booking.check_in,
    check_out: booking.check_out,
    guests: booking.guest_count,
    total_usd: booking.total_usd,
    platform_fee_usd: booking.service_fee_usd,
    provider_amount_usd: booking.net_provider_usd,
    stripe_payment_intent_id: booking.payment_intent_id ?? null,
    stripe_checkout_session_id: booking.stripe_checkout_session_id ?? null,
    notes: booking.notes ?? null,
    special_requests: booking.special_requests ?? null,
  };
}

/** Insert a new booking into Supabase. Returns true on success. */
export async function insertBooking(
  booking: LocalBooking,
  touristId?: string | null
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from('bookings').insert(toSupabaseRow(booking, touristId));
  if (error) {
    console.error('[supabase:bookings] insert error:', error.message);
    return false;
  }
  return true;
}

/** Update booking status (and optional fields) in Supabase. Returns true on success. */
export async function updateBookingInSupabase(
  id: string,
  status: BookingStatus,
  extra: {
    stripe_payment_intent_id?: string;
    stripe_checkout_session_id?: string;
    cancellation_reason?: string;
  } = {}
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

  if (extra.stripe_payment_intent_id) updates.stripe_payment_intent_id = extra.stripe_payment_intent_id;
  if (extra.stripe_checkout_session_id) updates.stripe_checkout_session_id = extra.stripe_checkout_session_id;
  if (extra.cancellation_reason) updates.cancellation_reason = extra.cancellation_reason;

  // Set timestamp fields based on status transition
  if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
  else if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
  else if (status === 'completed') updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from('bookings').update(updates).eq('id', id);
  if (error) {
    console.error('[supabase:bookings] update error:', error.message);
    return false;
  }
  return true;
}

/** Update booking by Stripe checkout session ID. Returns true on success. */
export async function updateBookingBySessionInSupabase(
  sessionId: string,
  status: BookingStatus,
  extra: { stripe_payment_intent_id?: string } = {}
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (extra.stripe_payment_intent_id) updates.stripe_payment_intent_id = extra.stripe_payment_intent_id;
  if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
  else if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('stripe_checkout_session_id', sessionId);

  if (error) {
    console.error('[supabase:bookings] updateBySession error:', error.message);
    return false;
  }
  return true;
}

/** Fetch a booking from Supabase by ID. Returns null if not found or on error. */
export async function getBookingFromSupabase(id: string) {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}
