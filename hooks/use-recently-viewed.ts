'use client';

import { useRecentlyViewedStore } from '@/stores/recently-viewed-store';
import type { RecentlyViewedItem } from '@/stores/recently-viewed-store';

export function useRecentlyViewed() {
  const { items, addItem, clear } = useRecentlyViewedStore();

  return {
    items,
    track: (item: Omit<RecentlyViewedItem, 'viewed_at'>) => addItem(item),
    clear,
  };
}
