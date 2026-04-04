'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useRecentlyViewedStore } from '@/stores/recently-viewed-store';
import type { RecentlyViewedItem } from '@/stores/recently-viewed-store';

export function useRecentlyViewed() {
  const { items, addItem, clear } = useRecentlyViewedStore();
  const { isAuthenticated, user } = useAuth();

  const track = useCallback(
    async (item: Omit<RecentlyViewedItem, 'viewed_at'>) => {
      // Always update local store for instant UI.
      addItem(item);

      // Also persist to Supabase when authenticated.
      if (isAuthenticated && user?.id) {
        const supabase = createClient();
        if (!supabase) return;
        await supabase.from('recently_viewed').upsert(
          { user_id: user.id, listing_id: item.id, viewed_at: new Date().toISOString() },
          { onConflict: 'user_id,listing_id' }
        );
      }
    },
    [addItem, isAuthenticated, user?.id]
  );

  return {
    items,
    track,
    clear,
  };
}
