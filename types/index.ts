export type MarcheType = 'Hiver' | 'Été' | 'Ramadan';

export type TravelDirection = 'Aller' | 'Retour';

export type DirectionType =
  | 'Tunis → Borj Cedria'
  | 'Borj Cedria → Tunis'
  | 'Tunis → Erriadh'
  | 'Erriadh → Tunis';

export interface CsvRow {
  trainNumber: string;
  direction: DirectionType;
  station: string;
  time: string;
}

export interface TrainStop {
  station: string;
  time: string;
}

export interface TrainTrip {
  trainNumber: string;
  direction: DirectionType;
  stops: TrainStop[];
  lineCode?: string;
  lineName?: string;
}

export interface RouteResult {
  trainNumber: string;
  direction: DirectionType;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  waitingMinutes: number;
  walkingMinutes: number;
  departureStation: string;
  arrivalStation: string;
  intermediateStops: string[];
  fareAmount?: number;
  fareCurrency?: string;
}

export interface StationInfo {
  name: string;
  lat: number;
  lon: number;
  lines: string[];
}

export interface FavoriteRoute {
  id: string;
  departure: string;
  arrival: string;
}
