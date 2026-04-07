import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { LISTING_CATEGORIES } from '@/lib/constants';
import { searchListings, mapTypeToCategory } from '@/lib/local-listings';
import type { Listing, ListingCategory } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!cat) return { title: 'Category Not Found' };
  return { title: `${cat.label} in Venezuela`, description: cat.description };
}

function scrapedToListing(l: ReturnType<typeof searchListings>[0]): Listing {
  return {
    id: l.id,
    provider_id: l.provider_id,
    title: l.name,
    slug: l.slug,
    description: l.description,
    short_description: l.description.slice(0, 160),
    category: mapTypeToCategory(l.type) as Listing['category'],
    tags: l.category_tags || [],
    region: l.region,
    location_name: l.address || l.region,
    latitude: l.latitude,
    longitude: l.longitude,
    address: l.address || null,
    price_usd: 0,
    price_ves: null,
    currency: 'USD',
    duration_hours: null,
    max_guests: 1,
    min_guests: 1,
    is_published: true,
    is_featured: l.platform_status === 'founding_partner',
    safety_level: 'yellow',
    rating: l.avg_rating || 0,
    total_reviews: l.review_count,
    total_bookings: 0,
    amenities: [],
    languages: ['es'],
    includes: [],
    excludes: [],
    cancellation_policy: '',
    meeting_point: null,
    cover_image_url: l.cover_image_url,
    created_at: l.created_at || new Date().toISOString(),
    updated_at: l.updated_at || new Date().toISOString(),
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!category) notFound();

  let listings: Listing[] | null = null;
  let source: 'supabase' | 'local' = 'supabase';

  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('*, provider:providers(business_name, is_verified)')
        .eq('is_published', true)
        .eq('category', slug as ListingCategory)
        .order('rating', { ascending: false });
      listings = data as Listing[] | null;
    }
  } catch {
    // Supabase not configured
  }

  // Fallback to local JSON data
  if (!listings || listings.length === 0) {
    const local = searchListings('', { category: slug, limit: 50 });
    if (local.length > 0) {
      listings = local.map(scrapedToListing);
      source = 'local';
    } else {
      // Tourism categories don't map to local data types, show all
      const all = searchListings('', { limit: 24 });
      if (all.length > 0) {
        listings = all.map(scrapedToListing);
        source = 'local';
      }
    }
  }

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category.icon}</span>
          <h1 className="text-3xl font-bold">{category.label}</h1>
        </div>
        <p className="text-muted-foreground">{category.description}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {listings?.length || 0} experiences found
          {source === 'local' && ' (showing top results)'}
        </p>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl">{category.icon}</span>
          <h3 className="font-semibold text-lg mt-4">No {category.label.toLowerCase()} experiences yet</h3>
          <p className="text-muted-foreground mt-1">Check back soon for new listings!</p>
        </div>
      )}
    </div>
  );
}
