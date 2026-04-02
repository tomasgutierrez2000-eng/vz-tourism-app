import { NextRequest, NextResponse } from 'next/server';
import { blockDates } from '@/lib/availability-store';
import fs from 'fs';
import path from 'path';

interface Params { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// iCal URL store (persists import URLs for re-sync)
// ---------------------------------------------------------------------------

const ICAL_URLS_FILE = path.join(process.cwd(), 'data', 'ical-urls.json');

interface ICalUrl {
  listing_id: string;
  url: string;
  source: string; // e.g. 'airbnb', 'booking.com', 'custom'
  last_synced: string;
}

function readICalUrls(): ICalUrl[] {
  if (!fs.existsSync(ICAL_URLS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ICAL_URLS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeICalUrls(urls: ICalUrl[]) {
  const dir = path.dirname(ICAL_URLS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ICAL_URLS_FILE, JSON.stringify(urls, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// iCal parser (no external dependency — handles standard VEVENT blocks)
// ---------------------------------------------------------------------------

interface ParsedEvent {
  uid: string;
  dtStart: string; // YYYY-MM-DD
  dtEnd: string;   // YYYY-MM-DD (exclusive in iCal, so we subtract 1 day)
  summary: string;
}

function parseICalDate(raw: string): string {
  // Handles: 20260415, 20260415T120000Z, 20260415T120000
  const digits = raw.replace(/[TZ]/g, '').substring(0, 8);
  return `${digits.substring(0, 4)}-${digits.substring(4, 6)}-${digits.substring(6, 8)}`;
}

function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0]!;
}

function parseICal(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let inEvent = false;
  let current: Partial<ParsedEvent> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      inEvent = false;
      if (current.dtStart && current.dtEnd && current.uid) {
        // iCal DTEND for all-day events is exclusive, so subtract 1 day
        const endInclusive = subtractOneDay(current.dtEnd);
        if (endInclusive >= current.dtStart) {
          events.push({
            uid: current.uid,
            dtStart: current.dtStart,
            dtEnd: endInclusive,
            summary: current.summary ?? 'Blocked',
          });
        }
      }
      current = {};
      continue;
    }

    if (!inEvent) continue;

    // Parse key:value (handle parameters like DTSTART;VALUE=DATE:20260415)
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.substring(0, colonIdx).split(';')[0]!.toUpperCase();
    const value = line.substring(colonIdx + 1).trim();

    switch (key) {
      case 'UID':
        current.uid = value;
        break;
      case 'DTSTART':
        current.dtStart = parseICalDate(value);
        break;
      case 'DTEND':
        current.dtEnd = parseICalDate(value);
        break;
      case 'SUMMARY':
        current.summary = value;
        break;
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Import handler
// ---------------------------------------------------------------------------

async function syncICalUrl(listingId: string, url: string): Promise<number> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VZ-Tourism-Bot/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch iCal: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const events = parseICal(text);

  for (const event of events) {
    blockDates(listingId, event.dtStart, event.dtEnd, `ical:${event.summary}`);
  }

  return events.length;
}

/**
 * POST /api/listings/[id]/calendar/import
 *
 * Body: { url: string, source?: string, sync_now?: boolean }
 *
 * Stores the URL for future re-syncs, immediately fetches and blocks dates.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { url?: string; source?: string; sync_now?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { url, source = 'custom', sync_now = true } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Persist the URL
  const urls = readICalUrls();
  const existing = urls.findIndex((u) => u.listing_id === id && u.url === url);
  const entry: ICalUrl = {
    listing_id: id,
    url,
    source,
    last_synced: new Date().toISOString(),
  };
  if (existing >= 0) {
    urls[existing] = entry;
  } else {
    urls.push(entry);
  }
  writeICalUrls(urls);

  if (!sync_now) {
    return NextResponse.json({ success: true, synced: 0, message: 'URL saved, sync skipped' });
  }

  try {
    const count = await syncICalUrl(id, url);
    return NextResponse.json({
      success: true,
      synced: count,
      message: `Imported ${count} event${count !== 1 ? 's' : ''} from ${source}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * GET /api/listings/[id]/calendar/import
 *
 * Returns stored iCal URLs and optionally re-syncs them (?resync=1).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const resync = new URL(request.url).searchParams.get('resync') === '1';

  const urls = readICalUrls().filter((u) => u.listing_id === id);

  if (!resync) {
    return NextResponse.json({ data: urls });
  }

  const results: Array<{ url: string; synced: number; error?: string }> = [];
  for (const entry of urls) {
    try {
      const count = await syncICalUrl(id, entry.url);
      entry.last_synced = new Date().toISOString();
      results.push({ url: entry.url, synced: count });
    } catch (err) {
      results.push({
        url: entry.url,
        synced: 0,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  // Update last_synced timestamps
  const allUrls = readICalUrls();
  for (const result of results) {
    const idx = allUrls.findIndex(
      (u) => u.listing_id === id && u.url === result.url
    );
    if (idx >= 0 && !result.error) {
      allUrls[idx]!.last_synced = new Date().toISOString();
    }
  }
  writeICalUrls(allUrls);

  return NextResponse.json({ data: urls, results });
}
