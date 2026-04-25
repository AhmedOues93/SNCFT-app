import AsyncStorage from '@react-native-async-storage/async-storage';

import { FavoriteRoute } from '@/types';

const FAVORITES_KEY = 'sncft_favorites_routes_v1';

export const loadFavorites = async (): Promise<FavoriteRoute[]> => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as FavoriteRoute[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((fav) => Boolean(fav?.id && fav?.departure && fav?.arrival));
  } catch {
    return [];
  }
};

export const saveFavorites = async (favorites: FavoriteRoute[]): Promise<void> => {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.slice(0, 8)));
};

export const createFavoriteId = (departure: string, arrival: string): string =>
  `${departure}-${arrival}-${Date.now()}`;
