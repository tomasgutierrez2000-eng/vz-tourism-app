import { NextRequest, NextResponse } from 'next/server';
import { getAllContent } from '@/lib/discover-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const excludeId = searchParams.get('exclude');
  const limit = parseInt(searchParams.get('limit') ?? '9', 10);

  if (!region) {
    return NextResponse.json({ error: 'region is required' }, { status: 400 });
  }

  // Get all published/featured photos from the same region
  const items = getAllContent({ status: 'published', region });
  const featured = getAllContent({ status: 'featured', region });
  const all = [...featured, ...items.filter((i) => !featured.some((f) => f.id === i.id))];

  let posts = all.filter((i) => i.id !== excludeId);

  // Sort by proximity if coordinates are provided
  if (!isNaN(lat) && !isNaN(lng)) {
    posts.sort((a, b) => {
      const distA = Math.hypot(a.lat - lat, a.lng - lng);
      const distB = Math.hypot(b.lat - lat, b.lng - lng);
      return distA - distB;
    });
  }

  return NextResponse.json({
    posts: posts.slice(0, limit).map((p) => ({
      id: p.id,
      url: p.thumbnail_url || p.url,
      caption: p.caption,
      creator_handle: p.creator_handle,
      instagram_post_url: p.instagram_post_url,
      geo_label: p.geo_label,
      source_type: p.source_type,
    })),
  });
}
