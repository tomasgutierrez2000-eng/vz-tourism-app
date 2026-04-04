import { NextRequest, NextResponse } from 'next/server';
import { getBooking, updateBookingStatus, type BookingStatus } from '@/lib/bookings-store';
import { updateBookingInSupabase } from '@/lib/supabase/bookings';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: booking });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, notes, special_requests } = body as {
    status?: BookingStatus;
    notes?: string;
    special_requests?: string;
  };

  const validStatuses: BookingStatus[] = [
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'payment_submitted',
  ];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates: Partial<typeof booking> = {};
  if (notes !== undefined) updates.notes = notes;
  if (special_requests !== undefined) updates.special_requests = special_requests;

  const newStatus = status ?? booking.status;
  const updated = updateBookingStatus(id, newStatus, updates);

  // Mirror status update to Supabase
  await updateBookingInSupabase(id, newStatus);

  return NextResponse.json({ data: updated });
}
