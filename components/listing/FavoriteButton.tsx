'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const favorited = isAuthenticated && isFavorited(listingId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }
    toggleFavorite(listingId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow-sm',
        'transition-all hover:bg-white active:scale-90',
        className
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
      title={!isAuthenticated ? 'Sign in to save' : undefined}
    >
      <Heart
        className={cn(
          'w-4 h-4 transition-colors',
          favorited ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-gray-600'
        )}
      />
    </button>
  );
}
