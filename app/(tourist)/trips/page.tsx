'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useFavorites } from '@/hooks/use-favorites';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, isPast, isFuture, parseISO, format, formatDistanceToNow } from 'date-fns';
import {
  Luggage, MapPin, Calendar, Star, Heart, BookOpen, Pencil, Clock,
  Plus, Search, ListChecks, ChevronRight, Sparkles, Compass,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/common/GlassCard';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';

interface GuestBooking {
  id: string;
  listing_name: string;
  listing_slug: string | null;
  check_in: string;
  check_out: string;
  guest_count: number;
  total_usd: number;
  status: string;
  confirmation_code: string;
  payment_method: string;
}

interface SavedItinerary {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  stops?: unknown[];
}

interface SavedPlace {
  id: string;
  title: string;
  slug?: string;
  location_name?: string;
  cover_image_url?: string | null;
  price_usd?: number;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(dateStr: string) {
  return differenceInDays(parseISO(dateStr), new Date());
}

// Countdown component with flip-digit animation
function TripCountdown({ checkIn }: { checkIn: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = parseISO(checkIn).getTime() - now;
  if (diff <= 0) return <span className="text-amber-500 font-bold">Trip time!</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const units = [
    { value: days, label: 'd' },
    { value: hours, label: 'h' },
    { value: minutes, label: 'm' },
    { value: seconds, label: 's' },
  ];

  return (
    <div className="flex gap-2" aria-label={`${days} days, ${hours} hours, ${minutes} minutes until your trip`}>
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 font-mono text-lg font-bold tabular-nums min-w-[2.5rem]">
            {String(u.value).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase">{u.label}</div>
        </div>
      ))}
    </div>
  );
}

// Horizontal scroll carousel
function CollectionCarousel({ title, icon, children, emptyMessage, emptyHref, count }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  emptyMessage: string; emptyHref: string; count: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base flex items-center gap-2">
          {icon}
          {title}
          {count > 0 && (
            <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">{count}</span>
          )}
        </h2>
        {count > 3 && (
          <Link href="#" className="text-xs text-sky-500 hover:underline flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {count > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
          {children}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <div className="text-3xl mb-2 opacity-40">{icon}</div>
          <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
          <Link href={emptyHref} className="text-sm font-medium text-sky-500 hover:underline">
            Get started <ChevronRight className="w-3 h-3 inline" />
          </Link>
        </GlassCard>
      )}
    </motion.section>
  );
}

export default function TripsPage() {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const { items: recentlyViewed } = useRecentlyViewed();
  const { favorites } = useFavorites();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetch('/api/bookings/mine')
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));

    try {
      const stored = localStorage.getItem('vz-itineraries');
      if (stored) setItineraries(JSON.parse(stored));
    } catch {}

    const supabase = createClient();
    if (supabase) {
      (async () => {
        try {
          const { data } = await supabase
            .from('favorites')
            .select('listing_id, listings(id, title, slug, location_name, cover_image_url, price_usd)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            const places = data
              .map((row: { listing_id: string; listings: unknown }) => row.listings as SavedPlace | null)
              .filter((p): p is SavedPlace => p !== null);
            setSavedPlaces(places);
          }
        } catch {}
        setSavedLoading(false);
      })();
    } else {
      setSavedLoading(false);
    }
  }, [isAuthenticated, user]);

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' && isFuture(parseISO(b.check_in))
  );
  const pastTrips = bookings.filter((b) => isPast(parseISO(b.check_out)));
  const nextTrip = upcoming[0];

  // AI suggestion based on interests (static for now)
  const userInterests = ['beaches', 'mountains', 'adventure'];
  const suggestions: Record<string, { text: string; destination: string; href: string }> = {
    beaches: { text: 'Los Roques is stunning this time of year. Crystal-clear water, white sand, zero crowds.', destination: 'Los Roques', href: '/library/region/los-roques' },
    mountains: { text: 'The Andes near Merida are perfect right now. Cool weather, dramatic peaks, incredible hikes.', destination: 'Merida', href: '/library/region/merida' },
    adventure: { text: 'Canaima and Angel Falls are calling. The waterfalls are at peak flow.', destination: 'Canaima', href: '/library/region/canaima' },
  };
  const suggestion = suggestions[userInterests[0]] || suggestions.beaches;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-amber-50/20">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Greeting Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold">{getGreeting()}, {firstName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {upcoming.length > 0
              ? `You have ${upcoming.length} upcoming ${upcoming.length === 1 ? 'trip' : 'trips'}`
              : 'Ready for your next Venezuelan adventure?'}
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
        >
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-full text-sm font-medium whitespace-nowrap hover:bg-sky-600 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Plan Trip
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap hover:border-sky-400 transition-colors"
          >
            <Search className="w-4 h-4" /> Explore
          </Link>
          <Link
            href="/trips"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap hover:border-sky-400 transition-colors"
          >
            <ListChecks className="w-4 h-4" /> My Lists
          </Link>
        </motion.div>

        {/* Stats Overview */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <AnimatedCounter value={upcoming.length + pastTrips.length} label="Total Trips" size="md" />
            <AnimatedCounter value={savedPlaces.length + favorites.length} label="Saved" size="md" />
            <AnimatedCounter value={itineraries.length} label="Itineraries" size="md" />
            <AnimatedCounter value={recentlyViewed.length} label="Explored" size="md" />
          </div>
        </GlassCard>

        {/* Next Trip Hero Card */}
        <AnimatePresence>
          {nextTrip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <Link href={`/bookings/${nextTrip.id}`}>
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-sky-600 to-sky-800 text-white p-6 shadow-xl">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <div className="relative">
                    <Badge className="bg-white/20 text-white border-0 text-xs mb-3">Next Trip</Badge>
                    <h3 className="text-xl font-bold mb-1">{nextTrip.listing_name}</h3>
                    <p className="text-white/70 text-sm mb-4">
                      {format(parseISO(nextTrip.check_in), 'MMM d')} – {format(parseISO(nextTrip.check_out), 'MMM d, yyyy')}
                      {' · '}{nextTrip.guest_count} {nextTrip.guest_count === 1 ? 'guest' : 'guests'}
                    </p>
                    <div className="flex items-center justify-between">
                      <TripCountdown checkIn={nextTrip.check_in} />
                      <div className="text-right">
                        <div className="text-2xl font-bold">${nextTrip.total_usd}</div>
                        <div className="text-white/60 text-xs">total</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trip Timeline */}
        {(upcoming.length > 0 || pastTrips.length > 0) && (
          <div className="space-y-4">
            {upcoming.length > 0 && (
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
                  <Luggage className="w-4 h-4 text-sky-500" />
                  Upcoming
                  <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">{upcoming.length}</span>
                </h2>
                <div className="space-y-3">
                  {upcoming.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link href={`/bookings/${b.id}`}>
                        <GlassCard className="p-4 hover:shadow-xl transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{b.listing_name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(parseISO(b.check_in), 'MMM d')} – {format(parseISO(b.check_out), 'MMM d')}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-semibold text-sky-600">
                                {daysUntil(b.check_in) === 0 ? 'Today!' : `${daysUntil(b.check_in)}d`}
                              </span>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {pastTrips.length > 0 && (
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400" />
                  Past Trips
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{pastTrips.length}</span>
                </h2>
                <div className="space-y-3">
                  {pastTrips.slice(0, 3).map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <GlassCard className="p-4 opacity-80">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{b.listing_name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(parseISO(b.check_in), 'MMM d')} – {format(parseISO(b.check_out), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <button className="text-xs px-3 py-1.5 rounded-lg border hover:border-amber-400 hover:text-amber-600 transition-colors whitespace-nowrap">
                            <Star className="w-3 h-3 inline mr-1" />Review
                          </button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no trips at all */}
        {upcoming.length === 0 && pastTrips.length === 0 && !bookingsLoading && (
          <GlassCard className="p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Compass className="w-12 h-12 text-sky-300 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">Your adventure starts here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover incredible experiences across Venezuela and book your first trip
              </p>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-full text-sm font-medium hover:bg-sky-600 transition-colors"
              >
                <Search className="w-4 h-4" /> Explore Venezuela
              </Link>
            </motion.div>
          </GlassCard>
        )}

        {/* Collections */}
        <div className="space-y-6">
          {/* Saved Places */}
          <CollectionCarousel
            title="Saved Places"
            icon={<Heart className="w-4 h-4 text-red-400" />}
            count={savedPlaces.length}
            emptyMessage="Save places you love while exploring"
            emptyHref="/library"
          >
            {savedPlaces.map((place) => (
              <Link key={place.id} href={place.slug ? `/listing/${place.slug}` : '#'} className="snap-start flex-shrink-0 w-[240px]">
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="h-28 bg-gradient-to-br from-sky-100 to-amber-100 relative">
                    {place.cover_image_url && (
                      <img src={place.cover_image_url} alt={place.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-1">{place.title}</h3>
                    {place.location_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{place.location_name}
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </CollectionCarousel>

          {/* Itineraries */}
          <CollectionCarousel
            title="Itineraries"
            icon={<BookOpen className="w-4 h-4 text-sky-500" />}
            count={itineraries.length}
            emptyMessage="Create your first travel itinerary"
            emptyHref="/"
          >
            {itineraries.map((it) => (
              <Link key={it.id} href={`/itinerary/${it.id}`} className="snap-start flex-shrink-0 w-[240px]">
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow h-full"
                >
                  <h3 className="font-semibold text-sm mb-1">{it.title}</h3>
                  {it.start_date && (
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(it.start_date), 'MMM d')}
                      {it.end_date ? ` – ${format(parseISO(it.end_date), 'MMM d')}` : ''}
                    </p>
                  )}
                  {it.stops && (
                    <p className="text-xs text-muted-foreground mt-0.5">{(it.stops as unknown[]).length} stops</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 font-medium">View</span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 font-medium flex items-center gap-1">
                      <Pencil className="w-3 h-3" />Edit
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </CollectionCarousel>

          {/* Recently Viewed */}
          <CollectionCarousel
            title="Recently Viewed"
            icon={<Clock className="w-4 h-4 text-gray-400" />}
            count={recentlyViewed.length}
            emptyMessage="Places you've browsed will appear here"
            emptyHref="/library"
          >
            {recentlyViewed.map((item) => (
              <Link key={item.id} href={`/listing/${item.slug}`} className="snap-start flex-shrink-0 w-[240px]">
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="h-28 bg-gradient-to-br from-sky-100 to-amber-100 relative">
                    {item.cover_image_url && (
                      <Image src={item.cover_image_url} alt={item.title} fill className="object-cover" />
                    )}
                    <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full capitalize">
                      {item.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-1">{item.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{item.location_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.viewed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </CollectionCarousel>
        </div>

        {/* AI Suggestion Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative rounded-2xl overflow-hidden p-[1px] bg-gradient-to-r from-sky-400 via-amber-400 to-sky-400">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-sky-600 mb-1">AI Travel Tip</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {suggestion.text}
                  </p>
                  <Link
                    href={suggestion.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-sky-500 mt-2 hover:underline"
                  >
                    Explore {suggestion.destination} <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
