'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  date: string;
  is_available: boolean;
  price: number | null;
  booking_id: string | null;
}

interface AvailabilityCalendarProps {
  listingId: string;
  basePrice?: number;
  onBook?: (checkIn: string, checkOut: string, nights: number, total: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(year, month + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]!);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

const today = new Date().toISOString().split('T')[0]!;

// ---------------------------------------------------------------------------
// Single-month mini calendar
// ---------------------------------------------------------------------------

interface MonthGridProps {
  year: number;
  month: number;
  availability: Map<string, DayData>;
  checkIn: string | null;
  checkOut: string | null;
  hoverDate: string | null;
  onDayClick: (date: string) => void;
  onDayHover: (date: string | null) => void;
}

function MonthGrid({
  year,
  month,
  availability,
  checkIn,
  checkOut,
  hoverDate,
  onDayClick,
  onDayHover,
}: MonthGridProps) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rangeEnd = checkOut ?? hoverDate;

  const isInRange = (dateStr: string) => {
    if (!checkIn || !rangeEnd) return false;
    const [a, b] = checkIn <= rangeEnd ? [checkIn, rangeEnd] : [rangeEnd, checkIn];
    return dateStr > a && dateStr < b;
  };

  const isRangeStart = (dateStr: string) =>
    checkIn !== null && dateStr === checkIn;

  const isRangeEnd = (dateStr: string) =>
    rangeEnd !== null && dateStr === rangeEnd && dateStr !== checkIn;

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center font-medium text-sm mb-3">
        {formatMonthLabel(year, month)}
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = isoDate(year, month, day);
          const data = availability.get(dateStr);
          const isPast = dateStr < today;
          const unavailable = isPast || (data ? !data.is_available : false);
          const inRange = isInRange(dateStr);
          const isStart = isRangeStart(dateStr);
          const isEnd = isRangeEnd(dateStr);
          const isSelected = isStart || isEnd;

          return (
            <div
              key={dateStr}
              className={cn(
                'relative flex items-center justify-center',
                inRange && 'bg-primary/10',
                isStart && 'rounded-l-full bg-primary/10',
                isEnd && 'rounded-r-full bg-primary/10'
              )}
            >
              <button
                type="button"
                disabled={unavailable}
                onClick={() => !unavailable && onDayClick(dateStr)}
                onMouseEnter={() => onDayHover(dateStr)}
                onMouseLeave={() => onDayHover(null)}
                className={cn(
                  'w-9 h-9 rounded-full text-sm transition-colors flex flex-col items-center justify-center gap-0',
                  unavailable && 'opacity-30 cursor-not-allowed line-through text-muted-foreground',
                  !unavailable && !isSelected && 'hover:bg-muted',
                  isSelected && 'bg-primary text-primary-foreground font-medium',
                  dateStr === today && !isSelected && 'font-bold underline'
                )}
              >
                <span className="leading-none">{day}</span>
                {data?.price !== null && data?.price !== undefined && !unavailable && (
                  <span
                    className={cn(
                      'text-[9px] leading-none',
                      isSelected ? 'text-primary-foreground/70' : 'text-yellow-600 dark:text-yellow-400'
                    )}
                  >
                    ${data.price}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AvailabilityCalendar({
  listingId,
  basePrice,
  onBook,
  className,
}: AvailabilityCalendarProps) {
  const initialMonth = (() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  })();

  const [startMonth, setStartMonth] = useState(initialMonth);
  const secondMonth = addMonths(startMonth.year, startMonth.month, 1);

  const [availability, setAvailability] = useState<Map<string, DayData>>(new Map());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch 2 months of availability
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    // Fetch start of first month to end of second month
    const start = isoDate(startMonth.year, startMonth.month, 1);
    const endD = addMonths(startMonth.year, startMonth.month, 1);
    const lastDay = new Date(endD.year, endD.month + 1, 0).getDate();
    const end = isoDate(endD.year, endD.month, lastDay);

    try {
      const res = await fetch(
        `/api/listings/${listingId}/availability?start=${start}&end=${end}`
      );
      if (res.ok) {
        const d = await res.json();
        const map = new Map<string, DayData>();
        for (const entry of d.data ?? []) {
          map.set(entry.date, entry);
        }
        setAvailability(map);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [listingId, startMonth]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ---------------------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------------------

  const handleDayClick = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      // Start new selection
      setCheckIn(date);
      setCheckOut(null);
      return;
    }
    // Second click: set check-out
    if (date <= checkIn) {
      // Clicked before check-in — restart
      setCheckIn(date);
      setCheckOut(null);
      return;
    }
    // Validate: all dates in range must be available
    const rangeDates = datesInRange(checkIn, date);
    const hasUnavailable = rangeDates.some((d) => {
      if (d === checkIn) return false; // check-in day itself is ok
      const entry = availability.get(d);
      return entry ? !entry.is_available : false;
    });
    if (hasUnavailable) {
      // Restart selection from clicked date
      setCheckIn(date);
      setCheckOut(null);
      return;
    }
    setCheckOut(date);
  };

  const clearSelection = () => {
    setCheckIn(null);
    setCheckOut(null);
  };

  // ---------------------------------------------------------------------------
  // Pricing summary
  // ---------------------------------------------------------------------------

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;

  const total = (() => {
    if (!checkIn || !checkOut || nights <= 0) return 0;
    const rangeDates = datesInRange(checkIn, checkOut).slice(0, -1); // exclude checkout day
    return rangeDates.reduce((sum, d) => {
      const entry = availability.get(d);
      return sum + (entry?.price ?? basePrice ?? 0);
    }, 0);
  })();

  // ---------------------------------------------------------------------------
  // Prev / Next navigation
  // ---------------------------------------------------------------------------

  const prev = () =>
    setStartMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const next = () =>
    setStartMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const canGoPrev =
    startMonth.year > initialMonth.year ||
    startMonth.month > initialMonth.month;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-xl border bg-background p-4 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={!canGoPrev}
            className="w-8 h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {loading && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          <Button variant="ghost" size="icon" onClick={next} className="w-8 h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Two-month grid */}
        <div className="flex gap-6">
          <MonthGrid
            year={startMonth.year}
            month={startMonth.month}
            availability={availability}
            checkIn={checkIn}
            checkOut={checkOut}
            hoverDate={hoverDate}
            onDayClick={handleDayClick}
            onDayHover={setHoverDate}
          />
          <div className="w-px bg-border" />
          <MonthGrid
            year={secondMonth.year}
            month={secondMonth.month}
            availability={availability}
            checkIn={checkIn}
            checkOut={checkOut}
            hoverDate={hoverDate}
            onDayClick={handleDayClick}
            onDayHover={setHoverDate}
          />
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary inline-block" />
            Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-muted inline-block" />
            Unavailable
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
            Special price
          </span>
        </div>
      </div>

      {/* Booking summary */}
      {checkIn && (
        <div className="rounded-xl border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Your selection</h3>
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground mb-0.5">Check-in</div>
              <div className="font-medium">{checkIn}</div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground mb-0.5">Check-out</div>
              <div className={cn('font-medium', !checkOut && 'text-muted-foreground text-xs')}>
                {checkOut ?? 'Select a date'}
              </div>
            </div>
          </div>

          {checkOut && nights > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {nights} night{nights !== 1 ? 's' : ''}
                </span>
                {total > 0 && (
                  <span className="font-semibold">${total.toFixed(2)} total</span>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => onBook?.(checkIn, checkOut, nights, total)}
              >
                Book Now
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
