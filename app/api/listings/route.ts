// v2-date-filter
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listingSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { searchListings, getTotalCount, countListings, mapTypeToCategory } from '@/lib/local-listings';
import { getAllAvailabilityEntries, getRoomTypes } from '@/lib/availability-store';

function getDatesBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const current = new Date(checkIn + 'T00:00:00Z');
  const end = new Date(checkOut + 'T00:00:00Z');
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 2000);
  const offset = parseInt(searchParams.get('offset') || '0');
  const checkIn = searchParams.get('check_in') || undefined;
  const checkOut = searchParams.get('check_out') || undefined;
  const guests = parseInt(searchParams.get('guests') || '2');
  const amenitiesParam = searchParams.get('amenities') || '';
  const amenityFilter = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : [];

  // Verified listings with their known amenities
  const VERIFIED_AMENITIES: Record<string, string[]> = {
    '35da929e-6e02-42e1-adf2-cc61625194a6': ['wifi', 'pool', 'ac', 'parking', 'restaurant', 'hot_water', 'generator'],
  };

  const datesSelected = !!(checkIn && checkOut && checkIn < checkOut);

  if (!datesSelected) {
    // Fast path: no date filtering — use existing pagination
    const results = searchListings(search, { region, type, category, limit, offset });
    const count = countListings(search, { region, type, category });

    let data = results.map((l) => {
      const amenities = VERIFIED_AMENITIES[l.id] ?? [];
      const cancellation_policy =
        l.platform_status === 'founding_partner' ? 'flexible'
        : l.platform_status === 'verified' ? 'moderate'
        : undefined;
      return {
        id: l.id,
        title: l.name,
        name: l.name,
        slug: l.slug,
        type: l.type,
        category: mapTypeToCategory(l.type),
        description: l.description,
        latitude: l.latitude,
        longitude: l.longitude,
        region: l.region,
        city: l.city ?? (l.region ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        address: l.address,
        rating: l.avg_rating,
        review_count: l.review_count,
        phone: l.phone,
        website: l.website,
        instagram_handle: l.instagram_handle,
        google_place_id: l.google_place_id,
        cover_image_url: (l as any).cover_image_url ?? null,
        provider_id: l.provider_id,
        status: l.status,
        platform_status: l.platform_status || 'scraped',
        amenities,
        cancellation_policy,
      };
    });

    // Amenity filter: verified with matching amenities first, rest follows
    if (amenityFilter.length > 0) {
      const withAmenities = data.filter((l) =>
        l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a))
      );
      const without = data.filter(
        (l) => !(l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a)))
      );
      data = [...withAmenities, ...without];
    }

    return NextResponse.json({ data, count, offset, limit });
  }

  // Date-filtered path: load all matching listings, filter by availability, then paginate
  const allMatching = searchListings(search, { region, type, category, limit: 10000, offset: 0 });
  const nights = getDatesBetween(checkIn!, checkOut!);

  // Load all availability entries once (O(n) read instead of O(listings) reads)
  const allEntries = getAllAvailabilityEntries();

  // Build a map: listing_id -> Set<unavailable dates>
  const unavailDates = new Map<string, Set<string>>();
  const nightSet = new Set(nights);
  for (const entry of allEntries) {
    if ((!entry.is_available || entry.booking_id) && nightSet.has(entry.date)) {
      if (!unavailDates.has(entry.listing_id)) unavailDates.set(entry.listing_id, new Set());
      unavailDates.get(entry.listing_id)!.add(entry.date);
    }
  }

  type AvailStatus = 'available' | 'unknown';
  const availMap = new Map<string, AvailStatus>();
  const priceMap = new Map<string, { per_night: number | null; total: number | null; rooms_left: number | null }>();

  const filtered = allMatching.filter((l) => {
    const isVerified = l.platform_status === 'verified' || l.platform_status === 'founding_partner';

    if (isVerified) {
      // If listing has ANY unavailable date in the range → filter it out
      const blocked = unavailDates.get(l.id);
      if (blocked && blocked.size > 0) {
        return false;
      }
      availMap.set(l.id, 'available');

      // Get price info from room types
      const roomTypes = getRoomTypes(l.id);
      let perNight: number | null = null;
      let roomsLeft: number | null = null;

      if (roomTypes.length > 0) {
        const eligible = roomTypes.filter((r) => r.max_guests >= guests);
        if (eligible.length > 0) {
          perNight = Math.min(...eligible.map((r) => r.base_price));
          roomsLeft = eligible.reduce((sum, r) => sum + r.count, 0);
        }
      }

      priceMap.set(l.id, {
        per_night: perNight,
        total: perNight != null ? perNight * nights.length : null,
        rooms_left: roomsLeft,
      });
      return true;
    } else {
      // Scraped listing: always include, mark unknown
      availMap.set(l.id, 'unknown');
      return true;
    }
  });

  const totalFiltered = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const availableCount = [...availMap.values()].filter((v) => v === 'available').length;
  const unknownCount = [...availMap.values()].filter((v) => v === 'unknown').length;

  const data = paginated.map((l) => {
    const amenities = VERIFIED_AMENITIES[l.id] ?? [];
    const cancellation_policy =
      l.platform_status === 'founding_partner' ? 'flexible'
      : l.platform_status === 'verified' ? 'moderate'
      : undefined;
    return {
      id: l.id,
      title: l.name,
      name: l.name,
      slug: l.slug,
      type: l.type,
      category: mapTypeToCategory(l.type),
      description: l.description,
      latitude: l.latitude,
      longitude: l.longitude,
      region: l.region,
      city: l.city ?? (l.region ?? '').replace(/_/g, ' ').replace(/\w/g, (c) => c.toUpperCase()),
      address: l.address,
      rating: l.avg_rating,
      review_count: l.review_count,
      phone: l.phone,
      website: l.website,
      instagram_handle: l.instagram_handle,
      google_place_id: l.google_place_id,
      cover_image_url: (l as any).cover_image_url ?? null,
      provider_id: l.provider_id,
      status: l.status,
      platform_status: l.platform_status || 'scraped',
      amenities,
      cancellation_policy,
      availability: availMap.get(l.id) ?? 'unknown',
      price_per_night: priceMap.get(l.id)?.per_night ?? null,
      price_total: priceMap.get(l.id)?.total ?? null,
      rooms_left: priceMap.get(l.id)?.rooms_left ?? null,
    };
  });

  return NextResponse.json({
    data,
    count: totalFiltered,
    offset,
    limit,
    filters_applied: {
      check_in: checkIn,
      check_out: checkOut,
      nights: nights.length,
      guests,
      available_count: availableCount,
      unknown_count: unknownCount,
      total: availableCount + unknownCount,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 403 });

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...parsed.data, provider_id: provider.id, slug })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
