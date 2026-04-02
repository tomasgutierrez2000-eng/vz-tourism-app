'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { SlidersHorizontal, MapPin, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/common/SearchBar';
import { SuggestionChips } from '@/components/search/SuggestionChips';
import { AIResponsePanel } from '@/components/search/AIResponsePanel';
import { FilterOverlay } from '@/components/search/FilterOverlay';
import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel';
import { useSearch } from '@/hooks/use-search';
import { useItinerary } from '@/hooks/use-itinerary';
import { useAuth } from '@/hooks/use-auth';
import { useMapStore } from '@/stores/map-store';
import { BUSINESS_CATEGORIES } from '@/lib/mapbox/helpers';
import type { MapPin as MapPinType } from '@/types/map';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => ({ default: m.MapContainer })),
  { ssr: false }
);

const CATEGORY_FILTER_ALL = 'all';

export default function HomePage() {
  const { search, isStreaming, suggestions, isFilterOpen, toggleFilterPanel, hasSearched } =
    useSearch();
  const { isOpen: itineraryOpen, createNew } = useItinerary();
  const { isAuthenticated } = useAuth();
  const { setPins, hiddenCategories, toggleCategory } = useMapStore();
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTER_ALL);
  const [totalCount, setTotalCount] = useState(0);

  // Load all scraped listings as map pins on mount
  useEffect(() => {
    async function loadPins() {
      try {
        const res = await fetch('/api/listings?limit=2000');
        if (!res.ok) return;
        const json = await res.json();
        const listings: {
          id: string;
          title: string;
          latitude: number;
          longitude: number;
          category: string;
          rating: number | null;
          review_count: number;
          city: string;
          region: string;
        }[] = json.data ?? [];

        const pins: MapPinType[] = listings.map((l) => ({
          id: l.id,
          lat: l.latitude,
          lng: l.longitude,
          title: l.title,
          category: l.category,
          rating: l.rating ?? undefined,
          reviewCount: l.review_count,
          city: l.city,
          region: l.region,
          listingId: l.id,
        }));

        setPins(pins);
        setTotalCount(pins.length);
      } catch (err) {
        console.error('Failed to load map pins', err);
      }
    }

    loadPins();
  }, [setPins]);

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    if (cat === CATEGORY_FILTER_ALL) {
      // Show all — remove all hidden categories
      BUSINESS_CATEGORIES.forEach(({ key }) => {
        if (hiddenCategories.has(key)) toggleCategory(key);
      });
    } else {
      // Hide all except selected
      BUSINESS_CATEGORIES.forEach(({ key }) => {
        const shouldBeHidden = key !== cat;
        const isHidden = hiddenCategories.has(key);
        if (shouldBeHidden !== isHidden) toggleCategory(key);
      });
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapContainer className="w-full h-full" />
      </div>

      {/* Floating UI overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top search bar + filter chips */}
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
          <div className="space-y-2">
            <div className="flex gap-2">
              <SearchBar
                onSearch={search}
                isLoading={isStreaming}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-900 shadow-lg border border-gray-200"
                onClick={toggleFilterPanel}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Category filter chips */}
            {totalCount > 0 && !hasSearched && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => handleCategoryFilter(CATEGORY_FILTER_ALL)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-colors ${
                    activeCategory === CATEGORY_FILTER_ALL
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All ({totalCount.toLocaleString()})
                </button>
                {BUSINESS_CATEGORIES.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => handleCategoryFilter(key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-colors ${
                      activeCategory === key
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    style={
                      activeCategory === key ? { backgroundColor: color, borderColor: color } : {}
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeCategory === key ? 'white' : color }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Suggestion chips */}
            {!hasSearched && totalCount === 0 && (
              <SuggestionChips
                suggestions={suggestions.slice(0, 5)}
                onSelect={search}
                className="justify-center"
              />
            )}
          </div>
        </div>

        {/* AI Response Panel - left side */}
        {hasSearched && (
          <div className="pointer-events-auto absolute top-24 left-4 w-80 z-20 max-h-[calc(100vh-140px)]">
            <AIResponsePanel onSearch={search} />
          </div>
        )}

        {/* Bottom controls */}
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-white dark:bg-gray-900 shadow-lg border border-gray-200 rounded-2xl gap-2"
              onClick={() => createNew()}
            >
              <Route className="w-4 h-4" />
              Plan itinerary
            </Button>
          )}
          <a
            href="/library"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 rounded-2xl px-2.5 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <MapPin className="w-4 h-4" />
            Browse all
          </a>
        </div>
      </div>

      {/* Itinerary side panel */}
      {itineraryOpen && <ItineraryPanel />}

      {/* Filter overlay */}
      {isFilterOpen && <FilterOverlay onClose={toggleFilterPanel} />}
    </div>
  );
}
