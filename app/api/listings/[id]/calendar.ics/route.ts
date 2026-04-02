import { NextRequest, NextResponse } from 'next/server';
import { getAvailability } from '@/lib/availability-store';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/listings/[id]/calendar.ics
 *
 * Returns an iCal (.ics) feed for a listing's booked dates.
 * Can be imported into Google Calendar, Apple Calendar, etc.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Fetch the next 365 days of availability
  const start = new Date().toISOString().split('T')[0]!;
  const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;

  const entries = getAvailability(id, start, end);

  // Group consecutive booked days into ranges for cleaner VEVENT blocks
  const bookedRanges: Array<{
    booking_id: string;
    start: string;
    end: string;
  }> = [];

  let currentRange: { booking_id: string; start: string; end: string } | null = null;

  for (const entry of entries) {
    if (entry.booking_id && !entry.is_available) {
      if (currentRange && currentRange.booking_id === entry.booking_id) {
        currentRange.end = entry.date;
      } else {
        if (currentRange) bookedRanges.push(currentRange);
        currentRange = {
          booking_id: entry.booking_id,
          start: entry.date,
          end: entry.date,
        };
      }
    } else {
      if (currentRange) {
        bookedRanges.push(currentRange);
        currentRange = null;
      }
    }
  }
  if (currentRange) bookedRanges.push(currentRange);

  // Also include blocked (non-booking) ranges
  const blockedEntries = entries.filter(
    (e) => !e.is_available && !e.booking_id
  );
  const blockedRanges: Array<{ reason: string; start: string; end: string }> = [];
  let curBlocked: { reason: string; start: string; end: string } | null = null;

  for (const entry of blockedEntries) {
    const reason = entry.blocked_reason ?? 'Blocked';
    if (curBlocked && curBlocked.reason === reason) {
      curBlocked.end = entry.date;
    } else {
      if (curBlocked) blockedRanges.push(curBlocked);
      curBlocked = { reason, start: entry.date, end: entry.date };
    }
  }
  if (curBlocked) blockedRanges.push(curBlocked);

  // Build iCal
  const now = formatICalDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VZ Tourism//Availability//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Listing ${id} Bookings`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const range of bookedRanges) {
    const dtStart = range.start.replace(/-/g, '');
    // VEVENT end date is exclusive in iCal all-day events
    const endDate = new Date(range.end + 'T00:00:00Z');
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const dtEnd = endDate.toISOString().split('T')[0]!.replace(/-/g, '');

    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${range.booking_id}@vz-tourism`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:Booked`,
      `DESCRIPTION:Booking ${range.booking_id} for listing ${id}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }

  for (const range of blockedRanges) {
    const dtStart = range.start.replace(/-/g, '');
    const endDate = new Date(range.end + 'T00:00:00Z');
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const dtEnd = endDate.toISOString().split('T')[0]!.replace(/-/g, '');
    const uid = `blocked-${range.start}-${range.end}@vz-tourism`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:Blocked - ${range.reason}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const ical = lines.join('\r\n') + '\r\n';

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="listing-${id}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0]! + 'Z';
}
