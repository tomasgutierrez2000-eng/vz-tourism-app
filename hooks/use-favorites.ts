'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useFavoritesStore } from '@/stores/favorites-store';

export function useFavorites() {
  const { isAuthenticated, user } = useAuth();
  const { favorites, loaded, userId, setFavorites, addFavorite, removeFavorite, reset } =
    useFavoritesStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      reset();
      return;
    }
    // Already loaded for this user — skip fetching.
    if (loaded && userId === user.id) return;

    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setFavorites(
            data.map((row: { listing_id: string }) => row.listing_id),
            user.id
          );
        }
      });
  }, [isAuthenticated, user, loaded, userId, setFavorites, reset]);

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!isAuthenticated || !user) return;

      const supabase = createClient();
      if (!supabase) return;

      const isFav = favorites.includes(listingId);

      // Optimistic update first for instant UI feedback.
      if (isFav) {
        removeFavorite(listingId);
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
      } else {
        addFavorite(listingId);
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });
      }
    },
    [isAuthenticated, user, favorites, addFavorite, removeFavorite]
  );

  return {
    favorites,
    isFavorited: (id: string) => favorites.includes(id),
    toggleFavorite,
  };
}
