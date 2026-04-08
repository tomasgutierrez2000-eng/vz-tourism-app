import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ItinerariesClient } from './ItinerariesClient';

export const metadata: Metadata = {
  title: 'Discover Itineraries | VZ Explorer',
  description: 'Browse curated Venezuela trip plans from travelers and creators who know the country best',
};

export default async function ItinerariesPage() {
  let itineraries: unknown[] = [];
  let count = 0;
  let influencerPicks: unknown[] = [];
  let regions: string[] = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      // Fetch popular itineraries
      const { data, count: totalCount } = await supabase
        .from('itineraries')
        .select('*, user:users(full_name, avatar_url, role)', { count: 'exact' })
        .eq('is_public', true)
        .order('saves', { ascending: false })
        .limit(20);

      if (data) {
        itineraries = data.map((item: Record<string, unknown>) => ({
          ...item,
          recommendation_count: ((item.saves as number) || 0) + ((item.likes as number) || 0),
        }));
      }
      count = totalCount || 0;

      // Fetch distinct regions
      const { data: allItineraries } = await supabase
        .from('itineraries')
        .select('regions')
        .eq('is_public', true);

      if (allItineraries) {
        const regionSet = new Set<string>();
        allItineraries.forEach((it: { regions: string[] }) => {
          (it.regions || []).forEach((r: string) => regionSet.add(r));
        });
        regions = Array.from(regionSet).sort();
      }

      // Fallback regions if none found
      if (regions.length === 0) {
        regions = ['Los Roques', 'Mérida', 'Canaima', 'Margarita', 'Caracas', 'Gran Sabana'];
      }

      // Fetch influencer picks
      const { data: influencerItineraries } = await supabase
        .from('itineraries')
        .select('*, user:users(full_name, avatar_url, role)')
        .eq('is_public', true)
        .eq('is_influencer_pick', true)
        .order('saves', { ascending: false })
        .limit(6);

      if (influencerItineraries && influencerItineraries.length > 0) {
        // Fetch creator profiles for influencer itineraries
        const userIds = influencerItineraries.map((i: Record<string, unknown>) => i.user_id);
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('*')
          .in('user_id', userIds);

        if (creators) {
          influencerPicks = influencerItineraries
            .map((it: Record<string, unknown>) => {
              const creator = creators.find((c: Record<string, unknown>) => c.user_id === it.user_id);
              if (!creator) return null;
              return { creator, itinerary: it };
            })
            .filter(Boolean);
        }
      }
    }
  } catch {
    // Supabase not configured
  }

  return (
    <div className="container px-4 py-8 max-w-6xl mx-auto">
      <ItinerariesClient
        initialItineraries={itineraries as Parameters<typeof ItinerariesClient>[0]['initialItineraries']}
        initialCount={count}
        influencerPicks={influencerPicks as unknown as Parameters<typeof ItinerariesClient>[0]['influencerPicks']}
        regions={regions}
      />
    </div>
  );
}
