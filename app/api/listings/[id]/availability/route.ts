import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailability,
  setAvailability,
  blockDates,
  unblockDates,
} from '@/lib/availability-store';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/listings/[id]/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns each date in the range with: is_available, price, booking_id.
 * Falls back to start=today, end=today+60 if params are missing.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const today = new Date().toISOString().split('T')[0]!;
  const defaultEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;

  const start = searchParams.get('start') ?? today;
  const end = searchParams.get('end') ?? defaultEnd;

  // Legacy month param support (year + month)
  let resolvedStart = start;
  let resolvedEnd = end;
  const month = searchParams.get('month'); // YYYY-MM
  const year = searchParams.get('year');
  const monthNum = searchParams.get('month');
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    resolvedStart = `${month}-01`;
    resolvedEnd = `${month}-31`;
  } else if (year && monthNum && /^\d+$/.test(year) && /^\d+$/.test(monthNum)) {
    const m = String(monthNum).padStart(2, '0');
    resolvedStart = `${year}-${m}-01`;
    resolvedEnd = `${year}-${m}-31`;
  }

  try {
    const entries = getAvailability(id, resolvedStart, resolvedEnd);
    const data = entries.map((e) => ({
      date: e.date,
      is_available: e.is_available,
      price: e.price_override ?? null,
      booking_id: e.booking_id ?? null,
      blocked_reason: e.blocked_reason ?? null,
      room_type: e.room_type ?? null,
      notes: e.notes ?? null,
    }));
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/listings/[id]/availability
 *
 * Body variants:
 *   { dates: string[], is_available: boolean, price_override?: number, reason?: string }
 *   { action: 'block', start: string, end: string, reason?: string }
 *   { action: 'unblock', start: string, end: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const action = body.action as string | undefined;

    if (action === 'block') {
      const start = body.start as string;
      const end = body.end as string;
      const reason = (body.reason as string | undefined) ?? 'blocked';
      if (!start || !end) {
        return NextResponse.json(
          { error: 'start and end are required for block action' },
          { status: 400 }
        );
      }
      blockDates(id, start, end, reason);
      return NextResponse.json({ success: true });
    }

    if (action === 'unblock') {
      const start = body.start as string;
      const end = body.end as string;
      if (!start || !end) {
        return NextResponse.json(
          { error: 'start and end are required for unblock action' },
          { status: 400 }
        );
      }
      unblockDates(id, start, end);
      return NextResponse.json({ success: true });
    }

    // Default: set availability for explicit date list
    const dates = body.dates as string[] | undefined;
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: 'dates array is required' },
        { status: 400 }
      );
    }

    const is_available = body.is_available as boolean;
    const price_override = (body.price_override as number | undefined) ?? null;
    const reason = (body.reason as string | undefined) ?? null;
    const notes = (body.notes as string | undefined) ?? null;
    const room_type = (body.room_type as string | undefined) ?? null;

    setAvailability(id, dates, is_available, {
      price_override,
      reason,
      notes,
      room_type,
    });

    return NextResponse.json({ success: true, updated: dates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
