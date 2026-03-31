'use client';

import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItineraryStopCard } from './ItineraryStopCard';
import type { ItineraryStop } from '@/types/database';
import { cn } from '@/lib/utils';

interface ItineraryDaySectionProps {
  day: number;
  title: string;
  stops: ItineraryStop[];
  onAddStop?: (day: number) => void;
  onRemoveStop?: (stopId: string) => void;
  onMoveStop?: (stopId: string, newDay: number, newOrder: number) => void;
  onRemoveDay?: (day: number) => void;
  className?: string;
}

export function ItineraryDaySection({
  day,
  title,
  stops,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onRemoveDay,
  className,
}: ItineraryDaySectionProps) {
  const dragStopIdRef = useRef<string | null>(null);
  const dragSourceDayRef = useRef<number | null>(null);

  const handleDragStart = (stopId: string, sourceDay: number) => {
    dragStopIdRef.current = stopId;
    dragSourceDayRef.current = sourceDay;
  };

  const handleDrop = (e: React.DragEvent, targetOrder: number) => {
    e.preventDefault();
    const stopId = dragStopIdRef.current;
    if (!stopId || !onMoveStop) return;
    onMoveStop(stopId, day, targetOrder);
    dragStopIdRef.current = null;
    dragSourceDayRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
            {day}
          </div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </span>
        </div>
        {onRemoveDay && (
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveDay(day)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Stops */}
      <div
        className="ml-3 border-l-2 border-muted pl-3 space-y-2"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, stops.length)}
      >
        {stops.map((stop, idx) => (
          <div
            key={stop.id}
            draggable
            onDragStart={() => handleDragStart(stop.id, day)}
            onDrop={(e) => {
              e.stopPropagation();
              handleDrop(e, idx);
            }}
            onDragOver={handleDragOver}
          >
            <ItineraryStopCard
              stop={stop}
              onRemove={onRemoveStop}
              isDraggable
            />
          </div>
        ))}

        {stops.length === 0 && (
          <div
            className="py-4 border-2 border-dashed border-muted rounded-lg text-center"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 0)}
          >
            <p className="text-xs text-muted-foreground">Drop stops here or add one below</p>
          </div>
        )}

        {onAddStop && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs border border-dashed"
            onClick={() => onAddStop(day)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add stop
          </Button>
        )}
      </div>
    </div>
  );
}
