'use client';

import { useEffect } from 'react';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';

interface RecentlyViewedTrackerProps {
  listingId: string;
}

/** Drop this component on any listing detail page to record the view in Supabase. */
export function RecentlyViewedTracker({ listingId }: RecentlyViewedTrackerProps) {
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    trackView(listingId);
  }, [listingId, trackView]);

  return null;
}
