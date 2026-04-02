import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ExploreTabs } from './ExploreTabs';
import type { Itinerary } from '@/types/database';

export const metadata: Metadata = {
  title: 'Explore Itineraries',
  description: 'Discover travel itineraries created by the Venezuela tourism community',
};

export default async function ExplorePage() {
  let trending = null;
  let newest = null;

  try {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: trendingData }, { data: newestData }] = await Promise.all([
        supabase
          .from('itineraries')
          .select('*, user:users(id, full_name, avatar_url, role)')
          .eq('is_public', true)
          .order('likes', { ascending: false })
          .limit(24),
        supabase
          .from('itineraries')
          .select('*, user:users(id, full_name, avatar_url, role)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(24),
      ]);
      trending = trendingData;
      newest = newestData;
    }
  } catch {
    // Supabase not configured, show page without DB data
  }

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Explore Itineraries</h1>
        <p className="text-muted-foreground mt-2">
          Discover real travel itineraries from Venezuela explorers
        </p>
      </div>

      <ExploreTabs
        trending={(trending || []) as Itinerary[]}
        newest={(newest || []) as Itinerary[]}
      />
    </div>
  );
}
