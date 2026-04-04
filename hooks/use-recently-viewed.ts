'use client';

import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const { isAuthenticated, user } = useAuth();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Fetch on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setRecentIds([]);
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from('recently_viewed')
      .select('listing_id, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(MAX_ITEMS)
      .then(({ data }) => {
        if (data) setRecentIds(data.map((r: { listing_id: string }) => r.listing_id));
      });
  }, [isAuthenticated, user]);

  /** Call this when a user views a listing. Upserts the row and keeps only the 10 most recent. */
  const trackView = useCallback(
    async (listingId: string) => {
      if (!isAuthenticated || !user) return;

      const supabase = createClient();
      if (!supabase) return;

      // Upsert — update viewed_at if row already exists
      await supabase
        .from('recently_viewed')
        .upsert(
          { user_id: user.id, listing_id: listingId, viewed_at: new Date().toISOString() },
          { onConflict: 'user_id,listing_id' }
        );

      // Update local state optimistically (move to front, cap at MAX_ITEMS)
      setRecentIds((prev) => {
        const filtered = prev.filter((id) => id !== listingId);
        return [listingId, ...filtered].slice(0, MAX_ITEMS);
      });

      // Prune rows beyond MAX_ITEMS in DB
      const { data: oldest } = await supabase
        .from('recently_viewed')
        .select('id, viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .range(MAX_ITEMS, 100);

      if (oldest && oldest.length > 0) {
        await supabase
          .from('recently_viewed')
          .delete()
          .in('id', oldest.map((r: { id: string }) => r.id));
      }
    },
    [isAuthenticated, user]
  );

  return { recentIds, trackView };
}
