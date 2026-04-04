'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface TrendingListing {
  id: string;
  title: string;
  slug: string;
  region: string;
  city: string | null;
  rating: number | null;
  cover_image_url: string | null;
}

export function TrendingSection() {
  const [listings, setListings] = useState<TrendingListing[]>([]);

  useEffect(() => {
    fetch('/api/listings?sort=rating&limit=6')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setListings(data);
        else if (Array.isArray(data?.data)) setListings(data.data);
        else if (Array.isArray(data?.listings)) setListings(data.listings);
      })
      .catch(() => {});
  }, []);

  if (listings.length === 0) return null;

  return (
    <section style={{ padding: '0 0 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#111' }}>
          Trending Now
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'none',
          }}
        >
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listing/${listing.slug}`}
              style={{
                flexShrink: 0,
                width: 200,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ position: 'relative', height: 130, background: '#e0e0e0' }}>
                {listing.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos?url=${encodeURIComponent(listing.cover_image_url)}`}
                    alt={listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {listing.title}
                </p>
                <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px' }}>
                  {listing.city ?? listing.region}
                </p>
                {listing.rating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{listing.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
