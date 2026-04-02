'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueDataPoint {
  date: string;
  revenue: number;
}

interface FunnelDataPoint {
  name: string;
  value: number;
}

interface PaymentMethodDataPoint {
  name: string;
  value: number;
}

interface OccupancyDataPoint {
  week: string;
  occupancy: number;
}

interface BookingsByListingPoint {
  listing: string;
  bookings: number;
}

export interface AnalyticsChartsProps {
  revenueData: RevenueDataPoint[];
  funnelData: FunnelDataPoint[];
  paymentMethodData: PaymentMethodDataPoint[];
  occupancyData: OccupancyDataPoint[];
  bookingsByListing: BookingsByListingPoint[];
}

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const FUNNEL_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export function AnalyticsCharts({
  revenueData,
  funnelData,
  paymentMethodData,
  occupancyData,
  bookingsByListing,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No revenue data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking conversion funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                {funnelData.map((_, i) => null)}
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No funnel data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings by payment method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethodData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {paymentMethodData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value as number, 'Bookings']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No payment data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Occupancy rate trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy Rate by Week</CardTitle>
        </CardHeader>
        <CardContent>
          {occupancyData.some((d) => d.occupancy > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={occupancyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(value) => [`${(value as number).toFixed(0)}%`, 'Occupancy']} />
                <Area
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No occupancy data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings by listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Listing</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsByListing.some((d) => d.bookings > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bookingsByListing} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="listing" type="category" tick={{ fontSize: 10 }} width={90} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No booking data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
