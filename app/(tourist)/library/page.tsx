import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { TrendingSection } from '@/components/library/TrendingSection';
import type { Listing } from '@/types/database';

export const metadata: Metadata = {
  title: 'Discover Venezuela',
  description: 'Browse all tourism experiences across Venezuela',
};

const CATEGORY_CARDS = [
  { value: 'beach', label: 'Beaches', subtitle: 'Caribbean & Atlantic shores', photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop' },
  { value: 'mountain', label: 'Mountains', subtitle: 'Andes & tepuis', photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop' },
  { value: 'city', label: 'Cities', subtitle: 'Urban experiences', photo: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop' },
  { value: 'nature', label: 'Nature', subtitle: 'Jungles & waterfalls', photo: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop' },
  { value: 'food', label: 'Food', subtitle: 'Cuisine & flavors', photo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop' },
  { value: 'adventure', label: 'Adventure', subtitle: 'Thrills & sports', photo: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=600&h=400&fit=crop' },
  { value: 'wellness', label: 'Wellness', subtitle: 'Spas & relaxation', photo: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=600&h=400&fit=crop' },
  { value: 'heritage', label: 'Heritage', subtitle: 'History & culture', photo: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=400&fit=crop' },
];

const DESTINATION_CARDS = [
  { id: 'losroques', name: 'Los Roques', subtitle: 'Caribbean archipelago paradise', photo: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=300&fit=crop', tags: ['Beaches', 'Diving', 'Island'] },
  { id: 'merida', name: 'Mérida', subtitle: 'Gateway to the Andes', photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=300&fit=crop', tags: ['Mountains', 'Hiking', 'Culture'] },
  { id: 'margarita', name: 'Margarita', subtitle: 'Pearl of the Caribbean', photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=300&fit=crop', tags: ['Beaches', 'Nightlife', 'Shopping'] },
  { id: 'canaima', name: 'Canaima', subtitle: 'Angel Falls & tepuis', photo: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=300&fit=crop', tags: ['Waterfalls', 'Jungle', 'UNESCO'] },
  { id: 'choroni', name: 'Choroní', subtitle: 'Caribbean colonial village', photo: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=300&fit=crop', tags: ['Beaches', 'Village', 'History'] },
  { id: 'morrocoy', name: 'Morrocoy', subtitle: 'Tropical national park', photo: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&h=300&fit=crop', tags: ['Beaches', 'Nature', 'Snorkeling'] },
  { id: 'caracas', name: 'Caracas', subtitle: 'Vibrant capital city', photo: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=300&fit=crop', tags: ['City', 'Art', 'Food'] },
];

export default async function LibraryPage() {
  let featuredListings = null;
  let recentListings = null;

  try {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: featured }, { data: recent }] = await Promise.all([
        supabase
          .from('listings')
          .select('*, provider:providers(business_name, is_verified, rating)')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('rating', { ascending: false })
          .limit(8),
        supabase
          .from('listings')
          .select('*, provider:providers(business_name, is_verified)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);
      featuredListings = featured;
      recentListings = recent;
    }
  } catch {
    // Supabase not configured, show page without DB data
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: '420px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=600&fit=crop"
          alt="Venezuelan Caribbean beach"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-5xl font-bold drop-shadow-lg mb-3">Discover Venezuela</h1>
          <p className="text-xl max-w-2xl drop-shadow" style={{ color: 'rgba(255,255,255,0.88)' }}>
            From pristine Caribbean beaches to Andean peaks — find your perfect Venezuelan adventure
          </p>
        </div>
      </div>

      <div className="container px-4 py-10 space-y-14">
        {/* Categories */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Browse by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORY_CARDS.map((cat) => (
              <Link
                key={cat.value}
                href={`/explore?category=${cat.value}`}
                className="group relative rounded-xl overflow-hidden"
                style={{ height: 200 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.photo}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.70) 40%, rgba(0,0,0,0.10) 100%)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="font-bold text-base leading-tight">{cat.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{cat.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Destinations */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Explore by destination</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DESTINATION_CARDS.map((dest) => (
              <Link
                key={dest.id}
                href={`/library/region/${dest.id}`}
                className="group relative rounded-xl overflow-hidden"
                style={{ height: 200 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dest.photo}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.08) 100%)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="font-bold text-lg leading-tight">{dest.name}</p>
                  <p className="text-sm mt-0.5 mb-2" style={{ color: 'rgba(255,255,255,0.80)' }}>{dest.subtitle}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {dest.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(4px)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Trending */}
        <TrendingSection />

        {/* Featured */}
        {featuredListings && featuredListings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Featured experiences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing as Listing} />
              ))}
            </div>
          </section>
        )}

        {/* Recent */}
        {recentListings && recentListings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recently added</h2>
              <Link href="/library/category" className="text-sm text-primary hover:underline">
                See all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing as Listing} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
