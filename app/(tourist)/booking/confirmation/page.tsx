import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBooking } from '@/lib/bookings-store';
import { ConfirmationClient } from './ConfirmationClient';

export const metadata: Metadata = { title: 'Booking Confirmed' };

// Force dynamic since booking data lives on disk
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">No booking ID provided.</p>
          <Link href="/" className="text-primary underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const booking = getBooking(id);
  if (!booking) notFound();

  return <ConfirmationClient booking={booking} />;
}
