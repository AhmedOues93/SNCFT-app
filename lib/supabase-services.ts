import { loadTripsForMarche } from '@/lib/csv';
import { STATIONS } from '@/lib/constants';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { DirectionType, MarcheType, StationInfo, TrainTrip } from '@/types';

interface SupabaseLine {
  id: string;
  name: string;
}

export interface SupabaseFare {
  departure: string;
  arrival: string;
  amount: number;
  currency: string;
}

interface TransitDataResult {
  stations: StationInfo[];
  lines: SupabaseLine[];
  trips: TrainTrip[];
  fares: SupabaseFare[];
  source: 'supabase' | 'csv';
}

const readString = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const readNumber = (row: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const isPublished = (row: Record<string, unknown>): boolean => {
  const publishedValue = row.published;
  if (typeof publishedValue === 'boolean') {
    return publishedValue;
  }

  const activeValue = row.active ?? row.is_active;
  if (typeof activeValue === 'boolean') {
    return activeValue;
  }

  const status = row.status;
  if (typeof status === 'string') {
    return ['published', 'active'].includes(status.toLowerCase());
  }

  return true;
};

const normalizeDirection = (value: string | null): DirectionType | null => {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replaceAll('->', '→')
    .replaceAll('vers', '→')
    .replace(/\s+/g, ' ')
    .trim();

  const validDirections: DirectionType[] = [
    'Tunis → Borj Cedria',
    'Borj Cedria → Tunis',
    'Tunis → Erriadh',
    'Erriadh → Tunis',
  ];

  const found = validDirections.find((direction) =>
    direction.toLowerCase().replaceAll(' ', '').includes(cleaned.toLowerCase().replaceAll(' ', '')),
  );

  return found ?? (validDirections.includes(cleaned as DirectionType) ? (cleaned as DirectionType) : null);
};

const normalizeStations = (rows: Record<string, unknown>[]): StationInfo[] => {
  const fallbackMap = new Map(STATIONS.map((station) => [station.name.toLowerCase(), station]));

  const normalized = rows
    .filter(isPublished)
    .map((row) => {
      const name = readString(row, ['name', 'station_name', 'label']);
      if (!name) {
        return null;
      }

      const fallback = fallbackMap.get(name.toLowerCase());
      return {
        name,
        lat: readNumber(row, ['lat', 'latitude']) ?? fallback?.lat ?? 0,
        lon: readNumber(row, ['lon', 'lng', 'longitude']) ?? fallback?.lon ?? 0,
        lines: fallback?.lines ?? [],
      } satisfies StationInfo;
    })
    .filter((station): station is StationInfo => station !== null);

  return normalized.length > 0 ? normalized : STATIONS;
};

const normalizeLines = (rows: Record<string, unknown>[]): SupabaseLine[] =>
  rows
    .filter(isPublished)
    .map((row) => {
      const id = readString(row, ['id', 'line_id', 'code']) ?? '';
      const name = readString(row, ['name', 'line_name', 'label']) ?? id;
      if (!id || !name) {
        return null;
      }
      return { id, name };
    })
    .filter((line): line is SupabaseLine => Boolean(line));

const normalizeTrips = (
  rows: Record<string, unknown>[],
  stationNameById: Map<string, string>,
  lineCodeById: Map<string, string>,
  marche: MarcheType,
): TrainTrip[] => {
  const grouped = new Map<string, { trainNumber: string; direction: DirectionType; lineCode?: string; lineName?: string; stops: { station: string; time: string; order: number }[] }>();

  rows.filter(isPublished).forEach((row, rowIndex) => {
    const marcheValue = readString(row, ['marche', 'season']);
    if (marcheValue && marcheValue !== marche) {
      return;
    }

    const direction = normalizeDirection(readString(row, ['direction', 'sens', 'route_direction']));
    const trainNumber = readString(row, ['train_number', 'train', 'numero_train', 'trip_code']);
    const stationName =
      readString(row, ['station_name', 'station']) ??
      stationNameById.get(readString(row, ['station_id']) ?? '') ??
      null;
    const time = readString(row, ['time', 'departure_time', 'schedule_time', 'horaire']);

    if (!direction || !trainNumber || !stationName || !time) {
      return;
    }

    const lineId = readString(row, ['line_id']);
    const lineCode = readString(row, ['line_code', 'line']) ?? (lineId ? lineCodeById.get(lineId) ?? lineId : null);
    const lineName = readString(row, ['line_name']);

    const key = [
      readString(row, ['trip_id', 'service_id', 'schedule_id']),
      trainNumber,
      direction,
      lineCode,
    ]
      .filter(Boolean)
      .join('-');

    if (!grouped.has(key)) {
      grouped.set(key, {
        trainNumber,
        direction,
        lineCode: lineCode ?? undefined,
        lineName: lineName ?? undefined,
        stops: [],
      });
    }

    const stopOrder = readNumber(row, ['stop_sequence', 'sequence', 'station_order']) ?? rowIndex;

    grouped.get(key)?.stops.push({ station: stationName, time, order: stopOrder });
  });

  return [...grouped.values()]
    .map((trip) => ({
      trainNumber: trip.trainNumber,
      direction: trip.direction,
      lineCode: trip.lineCode,
      lineName: trip.lineName,
      stops: trip.stops.sort((a, b) => a.order - b.order).map(({ station, time }) => ({ station, time })),
    }))
    .filter((trip) => trip.stops.length >= 2);
};

const normalizeFares = (
  rows: Record<string, unknown>[],
  stationNameById: Map<string, string>,
): SupabaseFare[] =>
  rows
    .filter(isPublished)
    .map((row) => {
      const departure =
        readString(row, ['departure_station', 'from_station_name', 'from_name']) ??
        stationNameById.get(readString(row, ['departure_station_id', 'from_station_id']) ?? '') ??
        null;
      const arrival =
        readString(row, ['arrival_station', 'to_station_name', 'to_name']) ??
        stationNameById.get(readString(row, ['arrival_station_id', 'to_station_id']) ?? '') ??
        null;
      const amount = readNumber(row, ['amount', 'price', 'fare']);
      const currency = readString(row, ['currency']) ?? 'TND';

      if (!departure || !arrival || amount === null) {
        return null;
      }

      return { departure, arrival, amount, currency } satisfies SupabaseFare;
    })
    .filter((fare): fare is SupabaseFare => fare !== null);

const fetchTable = async (table: string): Promise<Record<string, unknown>[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from(table).select('*');
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data as Record<string, unknown>[];
};

export const loadTransitData = async (marche: MarcheType): Promise<TransitDataResult> => {
  if (!hasSupabaseEnv || !supabase) {
    return {
      stations: STATIONS,
      lines: [],
      trips: await loadTripsForMarche(marche),
      fares: [],
      source: 'csv',
    };
  }

  try {
    const [linesRows, stationsRows, lineStationsRows, schedulesRows, faresRows] = await Promise.all([
      fetchTable('lines'),
      fetchTable('stations'),
      fetchTable('line_stations'),
      fetchTable('schedules'),
      fetchTable('fares'),
    ]);

    const stations = normalizeStations(stationsRows);
    const stationNameById = new Map<string, string>();
    stationsRows.forEach((row) => {
      const id = readString(row, ['id', 'station_id']);
      const name = readString(row, ['name', 'station_name', 'label']);
      if (id && name) {
        stationNameById.set(id, name);
      }
    });

    const lines = normalizeLines(linesRows);
    const lineCodeById = new Map<string, string>();
    linesRows.forEach((row) => {
      const id = readString(row, ['id', 'line_id']);
      const code = readString(row, ['code', 'line_code', 'name']);
      if (id && code) {
        lineCodeById.set(id, code);
      }
    });
    const publishedLineStations = lineStationsRows.filter(isPublished);
    const supabaseTrips = normalizeTrips(schedulesRows, stationNameById, lineCodeById, marche);
    const fares = normalizeFares(faresRows, stationNameById);

    if (stations.length > 0 && supabaseTrips.length > 0) {
      const linesWithStops = lines.map((line) => ({
        ...line,
        hasStops: publishedLineStations.some((ls) => String(ls['line_id'] ?? '') === line.id),
      }));
      return { stations, lines: linesWithStops.map(({ hasStops, ...line }) => line), trips: supabaseTrips, fares, source: 'supabase' };
    }

    return {
      stations: stations.length > 0 ? stations : STATIONS,
      lines,
      trips: await loadTripsForMarche(marche),
      fares,
      source: 'csv',
    };
  } catch {
    return {
      stations: STATIONS,
      lines: [],
      trips: await loadTripsForMarche(marche),
      fares: [],
      source: 'csv',
    };
  }
};

export const findFareForRoute = (
  fares: SupabaseFare[],
  departure: string,
  arrival: string,
): SupabaseFare | null => {
  const exact = fares.find((fare) => fare.departure === departure && fare.arrival === arrival);
  if (exact) {
    return exact;
  }

  return fares.find((fare) => fare.departure === arrival && fare.arrival === departure) ?? null;
};
