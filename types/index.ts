export type MarcheType = 'Hiver' | 'Été' | 'Ramadan';

export type LineCode = 'A' | 'D' | 'E';

export type LineFilter = LineCode | 'ALL';

export type DirectionType = string;

export interface CsvRow {
  lineCode: LineCode;
  lineName: string;
  direction: string;
  trainNumber: string;
  stationOrder: number;
  station: string;
  time: string;
}

export interface TrainStop {
  station: string;
  time: string;
  order?: number;
}

export interface TrainTrip {
  trainNumber: string;
  direction: string;
  stops: TrainStop[];
  lineCode: LineCode;
  lineName: string;
}

export interface JourneySegment {
  lineCode: LineCode;
  lineName: string;
  trainNumber: string;
  direction: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  intermediateStops: string[];
}

export interface RouteResult {
  id: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  transferCount: number;
  transferWaitingMinutes: number;
  walkingMinutes: number;
  totalMinutes: number;
  segments: JourneySegment[];
  fareAmount?: number;
  fareCurrency?: string;
  trainNumber?: string;
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

export interface FareInfo {
  lineCode: LineCode;
  amount: number;
  currency: string;
  fareType?: string;
}
