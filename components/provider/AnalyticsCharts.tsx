'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface OccupancyDataPoint {
  listing: string;
  bookings: number;
}

interface FunnelDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface TrafficDataPoint {
  name: string;
  value: number;
}

interface AnalyticsChartsProps {
  revenueData: RevenueDataPoint[];
  occupancyData: OccupancyDataPoint[];
  funnelData: FunnelDataPoint[];
  trafficData: TrafficDataPoint[];
}

const TRAFFIC_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsCharts({
  revenueData,
  occupancyData,
  funnelData,
  trafficData,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(0)}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
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

      {/* Booking occupancy by listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings by Listing</CardTitle>
        </CardHeader>
        <CardContent>
          {occupancyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={occupancyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="listing" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No booking data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="name" style={{ fontSize: 11 }} />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No funnel data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {trafficData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {trafficData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TRAFFIC_COLORS[index % TRAFFIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No source data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
