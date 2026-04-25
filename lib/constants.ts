import { DirectionType, MarcheType, StationInfo, TravelDirection } from '@/types';

export const APP_DISCLAIMER =
  'Horaires basés sur les données statiques SNCFT. Retards et suppressions non inclus.';

export const SNCFT_COLORS = {
  primary: '#0b5ed7',
  secondary: '#198754',
  background: '#edf4ff',
  text: '#0f172a',
  muted: '#64748b',
};

export const DIRECTIONS: DirectionType[] = [
  'Tunis → Borj Cedria',
  'Borj Cedria → Tunis',
  'Tunis → Erriadh',
  'Erriadh → Tunis',
];

export const TRAVEL_DIRECTIONS: TravelDirection[] = ['Aller', 'Retour'];

export const MARCHES: MarcheType[] = ['Hiver', 'Été', 'Ramadan'];

export const STATIONS: StationInfo[] = [
  { name: 'Tunis', lat: 36.799, lon: 10.181, lines: ['Borj Cedria', 'Erriadh'] },
  { name: 'Sayda Manoubia', lat: 36.793, lon: 10.17, lines: ['Borj Cedria'] },
  { name: 'Ennajah', lat: 36.787, lon: 10.164, lines: ['Borj Cedria'] },
  { name: 'Ezzouhour 2', lat: 36.781, lon: 10.159, lines: ['Borj Cedria'] },
  { name: 'Elhryria', lat: 36.773, lon: 10.155, lines: ['Borj Cedria'] },
  { name: 'Bougatfa', lat: 36.764, lon: 10.149, lines: ['Borj Cedria'] },
  { name: 'Rades', lat: 36.768, lon: 10.275, lines: ['Erriadh'] },
  { name: 'Hammam Lif', lat: 36.73, lon: 10.34, lines: ['Erriadh'] },
  { name: 'Borj Cedria', lat: 36.687, lon: 10.425, lines: ['Borj Cedria', 'Erriadh'] },
  { name: 'Erriadh', lat: 36.651, lon: 10.472, lines: ['Erriadh'] },
];

export const STATION_ORDER_BY_DIRECTION: Record<DirectionType, string[]> = {
  'Tunis → Borj Cedria': ['Tunis', 'Sayda Manoubia', 'Ennajah', 'Ezzouhour 2', 'Elhryria', 'Bougatfa', 'Borj Cedria'],
  'Borj Cedria → Tunis': ['Borj Cedria', 'Bougatfa', 'Elhryria', 'Ezzouhour 2', 'Ennajah', 'Sayda Manoubia', 'Tunis'],
  'Tunis → Erriadh': ['Tunis', 'Rades', 'Hammam Lif', 'Borj Cedria', 'Erriadh'],
  'Erriadh → Tunis': ['Erriadh', 'Borj Cedria', 'Hammam Lif', 'Rades', 'Tunis'],
};

export const DIRECTIONS_BY_TRAVEL_DIRECTION: Record<TravelDirection, DirectionType[]> = {
  Aller: ['Tunis → Borj Cedria', 'Tunis → Erriadh'],
  Retour: ['Borj Cedria → Tunis', 'Erriadh → Tunis'],
};

export const isDirectionCompatible = (
  direction: DirectionType,
  departure: string,
  arrival: string,
): boolean => {
  const order = STATION_ORDER_BY_DIRECTION[direction];
  const departureIndex = order.indexOf(departure);
  const arrivalIndex = order.indexOf(arrival);

  return departureIndex !== -1 && arrivalIndex !== -1 && departureIndex < arrivalIndex;
};

export const getIntermediateStops = (
  direction: DirectionType,
  departure: string,
  arrival: string,
): string[] => {
  const order = STATION_ORDER_BY_DIRECTION[direction];
  const departureIndex = order.indexOf(departure);
  const arrivalIndex = order.indexOf(arrival);

  if (departureIndex === -1 || arrivalIndex === -1 || departureIndex >= arrivalIndex - 1) {
    return [];
  }

  return order.slice(departureIndex + 1, arrivalIndex);
};
