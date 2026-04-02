/**
 * File-based availability store with atomic locking for overbooking prevention.
 * All data is persisted to data/availability.json and data/room-types.json.
 */
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecurringPattern =
  | 'always_available'
  | 'weekdays_only'
  | 'weekends_only'
  | 'custom';

export interface AvailabilityEntry {
  listing_id: string;
  date: string; // YYYY-MM-DD
  is_available: boolean;
  price_override?: number | null;
  notes?: string | null;
  room_type?: string | null;
  booking_id?: string | null; // set when a booking holds this date
  blocked_reason?: string | null; // 'personal' | 'maintenance' | 'holiday' | etc.
}

export interface BlockedRange {
  listing_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

export interface RoomType {
  id: string;
  listing_id: string;
  name: string;
  base_price: number;
  max_guests: number;
  amenities: string[];
  count: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const AVAIL_FILE = path.join(DATA_DIR, 'availability.json');
const ROOMS_FILE = path.join(DATA_DIR, 'room-types.json');
const LOCK_FILE = path.join(DATA_DIR, 'availability.lock');

// ---------------------------------------------------------------------------
// Low-level file helpers
// ---------------------------------------------------------------------------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAvailabilityRaw(): AvailabilityEntry[] {
  ensureDataDir();
  if (!fs.existsSync(AVAIL_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AVAIL_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAvailabilityRaw(entries: AvailabilityEntry[]) {
  ensureDataDir();
  fs.writeFileSync(AVAIL_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function readRoomTypesRaw(): RoomType[] {
  ensureDataDir();
  if (!fs.existsSync(ROOMS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeRoomTypesRaw(rooms: RoomType[]) {
  ensureDataDir();
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Atomic file lock (exclusive write-lock for overbooking prevention)
// ---------------------------------------------------------------------------

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;

async function acquireLock(): Promise<() => void> {
  const start = Date.now();
  ensureDataDir();

  while (true) {
    try {
      // O_EXCL | O_CREAT fails if the file already exists — gives us atomicity
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.closeSync(fd);
      // Return a release function
      return () => {
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch {
          // best effort
        }
      };
    } catch {
      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        // Stale lock — remove and retry once
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch {
          // already gone
        }
        continue;
      }
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function isWeekday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun, 6=Sat
  return dow >= 1 && dow <= 5;
}

function isWeekend(dateStr: string): boolean {
  return !isWeekday(dateStr);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get availability entries for a listing between two dates (inclusive).
 * Dates with no explicit entry default to is_available=true.
 */
export function getAvailability(
  listing_id: string,
  start_date: string,
  end_date: string
): AvailabilityEntry[] {
  const all = readAvailabilityRaw();
  const stored = new Map(
    all
      .filter((e) => e.listing_id === listing_id)
      .map((e) => [e.date, e])
  );

  return dateRange(start_date, end_date).map((date) => {
    if (stored.has(date)) return stored.get(date)!;
    // Default: available, no overrides
    return { listing_id, date, is_available: true };
  });
}

/**
 * Set availability for an array of dates.
 */
export function setAvailability(
  listing_id: string,
  dates: string[],
  is_available: boolean,
  options?: {
    price_override?: number | null;
    notes?: string | null;
    room_type?: string | null;
    reason?: string | null;
  }
) {
  const all = readAvailabilityRaw();

  for (const date of dates) {
    const idx = all.findIndex(
      (e) => e.listing_id === listing_id && e.date === date
    );
    const entry: AvailabilityEntry = {
      listing_id,
      date,
      is_available,
      price_override: options?.price_override ?? null,
      notes: options?.notes ?? null,
      room_type: options?.room_type ?? null,
      blocked_reason: !is_available ? (options?.reason ?? null) : null,
      booking_id: idx >= 0 ? all[idx]!.booking_id : null,
    };
    if (idx >= 0) {
      all[idx] = entry;
    } else {
      all.push(entry);
    }
  }

  writeAvailabilityRaw(all);
}

/**
 * Apply a recurring availability pattern to a date range.
 */
export function applyRecurringPattern(
  listing_id: string,
  start_date: string,
  end_date: string,
  pattern: RecurringPattern,
  options?: { price_override?: number | null }
) {
  const dates = dateRange(start_date, end_date);

  for (const date of dates) {
    let available = true;
    if (pattern === 'weekdays_only') available = isWeekday(date);
    else if (pattern === 'weekends_only') available = isWeekend(date);
    // 'always_available' and 'custom' => true for all

    setAvailability(listing_id, [date], available, {
      price_override: options?.price_override,
    });
  }
}

/**
 * Block a date range with an optional reason.
 */
export function blockDates(
  listing_id: string,
  start_date: string,
  end_date: string,
  reason = 'blocked'
) {
  const dates = dateRange(start_date, end_date);
  setAvailability(listing_id, dates, false, { reason });
}

/**
 * Unblock a date range (restore to available, clearing booking_id and reason).
 */
export function unblockDates(
  listing_id: string,
  start_date: string,
  end_date: string
) {
  const dates = dateRange(start_date, end_date);
  const all = readAvailabilityRaw();

  for (const date of dates) {
    const idx = all.findIndex(
      (e) => e.listing_id === listing_id && e.date === date
    );
    if (idx >= 0) {
      all[idx] = {
        ...all[idx]!,
        is_available: true,
        blocked_reason: null,
        booking_id: null,
      };
    } else {
      all.push({ listing_id, date, is_available: true });
    }
  }

  writeAvailabilityRaw(all);
}

/**
 * Return all explicitly blocked dates for a listing.
 */
export function getBlockedDates(listing_id: string): AvailabilityEntry[] {
  const all = readAvailabilityRaw();
  return all.filter(
    (e) => e.listing_id === listing_id && !e.is_available
  );
}

/**
 * Atomically check-and-lock a set of dates for a booking.
 * Returns { success: true } if all dates were free and are now locked,
 * or { success: false, conflict: string[] } if any date was already taken.
 *
 * Call releaseBookingDates() if the booking is ultimately rejected.
 * Call confirmBookingDates() to mark the dates as permanently booked.
 */
export async function lockDatesForBooking(
  listing_id: string,
  dates: string[],
  tentative_booking_id: string
): Promise<{ success: true } | { success: false; conflict: string[] }> {
  const release = await acquireLock();
  try {
    const all = readAvailabilityRaw();

    // Check every date
    const conflicts: string[] = [];
    for (const date of dates) {
      const entry = all.find(
        (e) => e.listing_id === listing_id && e.date === date
      );
      if (entry && (!entry.is_available || entry.booking_id)) {
        conflicts.push(date);
      }
    }

    if (conflicts.length > 0) {
      return { success: false, conflict: conflicts };
    }

    // Lock all dates
    for (const date of dates) {
      const idx = all.findIndex(
        (e) => e.listing_id === listing_id && e.date === date
      );
      const locked: AvailabilityEntry = {
        listing_id,
        date,
        is_available: false,
        booking_id: tentative_booking_id,
        blocked_reason: 'booking_hold',
      };
      if (idx >= 0) {
        all[idx] = locked;
      } else {
        all.push(locked);
      }
    }

    writeAvailabilityRaw(all);
    return { success: true };
  } finally {
    release();
  }
}

/**
 * Confirm that a booking is final — keeps dates blocked, updates reason.
 */
export async function confirmBookingDates(
  listing_id: string,
  dates: string[],
  booking_id: string
) {
  const release = await acquireLock();
  try {
    const all = readAvailabilityRaw();
    for (const date of dates) {
      const idx = all.findIndex(
        (e) => e.listing_id === listing_id && e.date === date
      );
      if (idx >= 0) {
        all[idx] = {
          ...all[idx]!,
          is_available: false,
          booking_id,
          blocked_reason: 'booking_confirmed',
        };
      }
    }
    writeAvailabilityRaw(all);
  } finally {
    release();
  }
}

/**
 * Release a booking hold (e.g., payment failed). Restores dates to available.
 */
export async function releaseBookingDates(
  listing_id: string,
  dates: string[]
) {
  const release = await acquireLock();
  try {
    const all = readAvailabilityRaw();
    for (const date of dates) {
      const idx = all.findIndex(
        (e) => e.listing_id === listing_id && e.date === date
      );
      if (idx >= 0) {
        all[idx] = {
          ...all[idx]!,
          is_available: true,
          booking_id: null,
          blocked_reason: null,
        };
      }
    }
    writeAvailabilityRaw(all);
  } finally {
    release();
  }
}

// ---------------------------------------------------------------------------
// Room type management
// ---------------------------------------------------------------------------

export function getRoomTypes(listing_id: string): RoomType[] {
  return readRoomTypesRaw().filter((r) => r.listing_id === listing_id);
}

export function upsertRoomType(
  room: Omit<RoomType, 'created_at' | 'updated_at'>
): RoomType {
  const all = readRoomTypesRaw();
  const now = new Date().toISOString();
  const idx = all.findIndex((r) => r.id === room.id);
  const updated: RoomType = { ...room, created_at: now, updated_at: now };
  if (idx >= 0) {
    updated.created_at = all[idx]!.created_at;
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  writeRoomTypesRaw(all);
  return updated;
}

export function deleteRoomType(id: string): boolean {
  const all = readRoomTypesRaw();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  all.splice(idx, 1);
  writeRoomTypesRaw(all);
  return true;
}
