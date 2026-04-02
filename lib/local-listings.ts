import fs from 'fs';
import path from 'path';

export interface ScrapedListing {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  city?: string;
  avg_rating: number | null;
  review_count: number;
  phone: string | null;
  website: string | null;
  instagram_handle: string | null;
  google_place_id: string | null;
  category_tags: string[];
  address: string;
  provider_id: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

let _cache: ScrapedListing[] | null = null;

function loadListings(): ScrapedListing[] {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), 'data', 'scraped-listings.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _cache = JSON.parse(raw) as ScrapedListing[];
  return _cache;
}

// Map scraped business types to display category
export function mapTypeToCategory(type: string): string {
  const t = (type || '').toLowerCase();
  if (['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'].includes(t))
    return 'hotel';
  if (['restaurante', 'restaurant', 'cafe', 'bar'].includes(t)) return 'restaurant';
  if (['tours', 'tour', 'transfer', 'experience', 'agencia'].includes(t)) return 'experience';
  return 'other';
}

const CATEGORY_TYPES: Record<string, string[]> = {
  hotel: ['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'],
  restaurant: ['restaurante', 'restaurant', 'cafe', 'bar'],
  experience: ['tours', 'tour', 'transfer', 'experience', 'agencia'],
};

export function searchListings(
  query: string,
  filters?: { region?: string; type?: string; category?: string; limit?: number; offset?: number }
): ScrapedListing[] {
  let results = loadListings();

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.region?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
    );
  }

  if (filters?.region) {
    results = results.filter((l) => l.region === filters.region);
  }
  if (filters?.type) {
    results = results.filter((l) => l.type === filters.type);
  }
  if (filters?.category) {
    const types = CATEGORY_TYPES[filters.category];
    if (types) {
      results = results.filter((l) => types.includes((l.type || '').toLowerCase()));
    } else if (filters.category === 'other') {
      const allKnown = Object.values(CATEGORY_TYPES).flat();
      results = results.filter((l) => !allKnown.includes((l.type || '').toLowerCase()));
    }
  }

  // Sort by rating * review_count for relevance
  results.sort(
    (a, b) =>
      (b.avg_rating || 0) * (b.review_count || 0) -
      (a.avg_rating || 0) * (a.review_count || 0)
  );

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 20;
  return results.slice(offset, offset + limit);
}

export function getListingBySlug(slug: string): ScrapedListing | undefined {
  return loadListings().find((l) => l.slug === slug);
}

export function getAllListings(): ScrapedListing[] {
  return loadListings();
}

export function getListingsByRegion(region: string): ScrapedListing[] {
  return loadListings().filter((l) => l.region === region);
}

export function getTotalCount(
  query?: string,
  filters?: { region?: string; type?: string }
): number {
  let results = loadListings();
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.region?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q)
    );
  }
  if (filters?.region) results = results.filter((l) => l.region === filters.region);
  if (filters?.type) results = results.filter((l) => l.type === filters.type);
  return results.length;
}
