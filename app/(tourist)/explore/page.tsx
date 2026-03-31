import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ExploreTabs } from './ExploreTabs';
import type { Itinerary } from '@/types/database';

export const metadata: Metadata = {
  title: 'Explore Itineraries',
  description: 'Discover travel itineraries created by the Venezuela tourism community',
};

export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: trending }, { data: newest }] = await Promise.all([
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
