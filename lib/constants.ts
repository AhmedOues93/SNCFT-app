import { MarcheType, StationInfo } from '@/types';

export const APP_DISCLAIMER =
  'Horaires basés sur les données statiques SNCFT. Retards et suppressions non inclus.';

export const SNCFT_COLORS = {
  primary: '#0b5ed7',
  secondary: '#198754',
  background: '#edf4ff',
  text: '#0f172a',
  muted: '#64748b',
};

export const MARCHES: MarcheType[] = ['Hiver', 'Été', 'Ramadan'];

export const STATIONS: StationInfo[] = [
  { name: 'Tunis', lat: 36.799, lon: 10.181, lines: ['A', 'D', 'E'] },
  { name: 'Sayda Manoubia', lat: 36.793, lon: 10.17, lines: ['E'] },
  { name: 'Mellassine', lat: 36.79, lon: 10.165, lines: ['D'] },
  { name: 'Erraoudha', lat: 36.785, lon: 10.16, lines: ['D'] },
  { name: 'Ettayaran', lat: 36.782, lon: 10.158, lines: ['E'] },
  { name: 'Ennajeh', lat: 36.787, lon: 10.164, lines: ['E'] },
  { name: 'Ezzouhour 2', lat: 36.781, lon: 10.159, lines: ['E'] },
  { name: 'El Hrairia', lat: 36.773, lon: 10.155, lines: ['E'] },
  { name: 'Bougatfa', lat: 36.764, lon: 10.149, lines: ['E'] },
  { name: 'Jebel Jelloud', lat: 36.757, lon: 10.19, lines: ['A'] },
  { name: 'Megrine', lat: 36.755, lon: 10.22, lines: ['A'] },
  { name: 'Rades', lat: 36.768, lon: 10.275, lines: ['A'] },
  { name: 'Hammam Lif', lat: 36.73, lon: 10.34, lines: ['A'] },
  { name: 'Borj Cedria', lat: 36.687, lon: 10.425, lines: ['A'] },
  { name: 'Goubaa', lat: 36.771, lon: 10.147, lines: ['D'] },
];

export const STATION_ORDER_BY_DIRECTION: Record<string, string[]> = {
  'Tunis → Bougatfa': ['Tunis', 'Sayda Manoubia', 'Ennajeh', 'Ettayaran', 'Ezzouhour 2', 'El Hrairia', 'Bougatfa'],
  'Bougatfa → Tunis': ['Bougatfa', 'El Hrairia', 'Ezzouhour 2', 'Ettayaran', 'Ennajeh', 'Sayda Manoubia', 'Tunis'],
  'Tunis → Goubaa': ['Tunis', 'Saida Manoubia', 'Mellassine', 'Erraoudha', 'Goubaa'],
  'Goubaa → Tunis': ['Goubaa', 'Erraoudha', 'Mellassine', 'Saida Manoubia', 'Tunis'],
  'Tunis Ville → Borj Cedria': ['Tunis', 'Jebel Jelloud', 'Megrine', 'Rades', 'Hammam Lif', 'Borj Cedria'],
  'Borj Cedria → Tunis Ville': ['Borj Cedria', 'Hammam Lif', 'Rades', 'Megrine', 'Jebel Jelloud', 'Tunis'],
};
