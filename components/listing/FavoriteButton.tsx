'use client';

import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  className?: string;
}

export function FavoriteButton({ listingId, className }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  if (!isAuthenticated) return null;

  const favorited = isFavorited(listingId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(listingId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow-sm',
        'transition-colors hover:bg-white active:scale-90',
        className
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
    >
      <Heart
        className={cn(
          'w-4 h-4 transition-colors',
          favorited ? 'fill-red-500 text-red-500' : 'text-gray-500'
        )}
      />
    </button>
  );
}
