import { create } from 'zustand';

interface FavoritesState {
  favorites: string[]; // listing IDs
  loaded: boolean;
  userId: string | null;
}

interface FavoritesActions {
  setFavorites: (favorites: string[], userId: string) => void;
  addFavorite: (listingId: string) => void;
  removeFavorite: (listingId: string) => void;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState & FavoritesActions>((set) => ({
  favorites: [],
  loaded: false,
  userId: null,

  setFavorites: (favorites, userId) => set({ favorites, loaded: true, userId }),
  addFavorite: (id) => set((s) => ({ favorites: [...s.favorites, id] })),
  removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter((f) => f !== id) })),
  reset: () => set({ favorites: [], loaded: false, userId: null }),
}));
