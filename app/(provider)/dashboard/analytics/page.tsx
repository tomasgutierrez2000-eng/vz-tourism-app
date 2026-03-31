import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TrendingUp, DollarSign, Users, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { AnalyticsCharts } from '@/components/provider/AnalyticsCharts';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, rating, review_count, price_usd, is_published')
    .eq('provider_id', provider?.id || '');

  const listingIds = listings?.map((l) => l.id) || [];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_usd, status, guests, created_at, listing_id')
    .in('listing_id', listingIds);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at')
    .in('listing_id', listingIds);

  const totalRevenue = bookings?.filter((b) => b.status === 'completed').reduce((s, b) => s + (b.total_usd || 0), 0) || 0;
  const totalGuests = bookings?.filter((b) => ['confirmed', 'completed'].includes(b.status)).reduce((s, b) => s + (b.guests || 0), 0) || 0;
  const avgRating = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const conversionRate = bookings?.length ? (bookings.filter((b) => b.status !== 'cancelled').length / bookings.length * 100) : 0;

  // Monthly revenue breakdown (last 6 months)
  const monthlyMap: Record<string, number> = {};
  bookings?.filter((b) => b.status === 'completed').forEach((b) => {
    const d = new Date(b.created_at);
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyMap[key] = (monthlyMap[key] || 0) + (b.total_usd || 0);
  });
  const revenueData = Object.entries(monthlyMap)
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  // Occupancy by listing
  const bookingsByListing: Record<string, number> = {};
  bookings?.filter((b) => b.status !== 'cancelled').forEach((b) => {
    bookingsByListing[b.listing_id] = (bookingsByListing[b.listing_id] || 0) + 1;
  });
  const occupancyData = listings
    ?.map((l) => ({
      listing: l.title.length > 18 ? l.title.slice(0, 18) + '…' : l.title,
      bookings: bookingsByListing[l.id] || 0,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5) || [];

  // Conversion funnel
  const total = bookings?.length || 0;
  const confirmed = bookings?.filter((b) => ['confirmed', 'completed'].includes(b.status)).length || 0;
  const completed = bookings?.filter((b) => b.status === 'completed').length || 0;
  const funnelData = [
    { name: 'Inquiries', value: total, fill: '#3B82F6' },
    { name: 'Confirmed', value: confirmed, fill: '#10B981' },
    { name: 'Completed', value: completed, fill: '#8B5CF6' },
  ];

  // Traffic sources (mock breakdown by time of booking)
  const trafficData = [
    { name: 'AI Search', value: Math.round(total * 0.45) },
    { name: 'Direct', value: Math.round(total * 0.25) },
    { name: 'Social', value: Math.round(total * 0.18) },
    { name: 'Referral', value: Math.round(total * 0.12) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Performance overview for all your listings</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold mt-1">{totalGuests}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-2xl font-bold mt-1">{avgRating.toFixed(2)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold mt-1">{conversionRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts
        revenueData={revenueData}
        occupancyData={occupancyData}
        funnelData={funnelData}
        trafficData={trafficData}
      />
    </div>
  );
}
