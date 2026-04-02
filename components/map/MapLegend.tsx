'use client';

import { useMapStore } from '@/stores/map-store';
import { BUSINESS_CATEGORIES } from '@/lib/mapbox/helpers';
import type { MapPin } from '@/types/map';

interface MapLegendProps {
  pins: MapPin[];
}

export function MapLegend({ pins }: MapLegendProps) {
  const { hiddenCategories, toggleCategory } = useMapStore();

  const counts = pins.reduce<Record<string, number>>((acc, pin) => {
    const cat = pin.category ?? 'other';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  if (pins.length === 0) return null;

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        Categories
      </p>
      <div className="space-y-1.5">
        {BUSINESS_CATEGORIES.map(({ key, label, color }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const hidden = hiddenCategories.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800 ${
                hidden ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span
                className="flex-shrink-0 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 leading-none">
                {label}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
