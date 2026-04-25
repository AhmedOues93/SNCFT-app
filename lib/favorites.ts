import AsyncStorage from '@react-native-async-storage/async-storage';

import { FavoriteRoute } from '@/types';

const FAVORITES_KEY = 'sncft_favorites_routes_v1';
const RECENTS_KEY = 'sncft_recent_routes_v1';

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

export const loadRecents = async (): Promise<FavoriteRoute[]> => {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as FavoriteRoute[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((recent) => Boolean(recent?.id && recent?.departure && recent?.arrival));
  } catch {
    return [];
  }
};

export const saveRecentRoute = async (departure: string, arrival: string): Promise<FavoriteRoute[]> => {
  const current = await loadRecents();
  const filtered = current.filter((item) => !(item.departure === departure && item.arrival === arrival));
  const next: FavoriteRoute[] = [
    { id: `${departure}-${arrival}-${Date.now()}`, departure, arrival },
    ...filtered,
  ].slice(0, 6);
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
};
