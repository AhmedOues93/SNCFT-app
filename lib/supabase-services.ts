import { loadFaresFromCsv, loadTripsForMarche } from '@/lib/csv';
import { STATIONS } from '@/lib/constants';
import { normalizeStationName } from '@/lib/station-name';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { FareInfo, LineCode, MarcheType, StationInfo, TrainTrip } from '@/types';

interface SupabaseLine {
  id: string;
  name: string;
}

interface TransitDataResult {
  stations: StationInfo[];
  lines: SupabaseLine[];
  trips: TrainTrip[];
  fares: FareInfo[];
  source: 'supabase' | 'csv';
}

const toLineCode = (value: string | null): LineCode | null => {
  if (value === 'A' || value === 'D' || value === 'E') {
    return value;
  }
  return null;
};

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
  const publishedValue = row.published ?? row.is_published;
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

const normalizeStations = (rows: Record<string, unknown>[]): StationInfo[] => {
  const fallbackMap = new Map(STATIONS.map((station) => [station.name.toLowerCase(), station]));

  const normalized = rows
    .filter(isPublished)
    .map((row) => {
      const rawName = readString(row, ['name', 'station_name', 'label']);
      if (!rawName) {
        return null;
      }

      const name = normalizeStationName(rawName);
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
  const grouped = new Map<string, TrainTrip>();

  rows.filter(isPublished).forEach((row, rowIndex) => {
    const marcheValue = (readString(row, ['marche', 'season']) || '').toLowerCase();
    if (marcheValue && !marcheValue.includes(marche.toLowerCase())) {
      return;
    }

    const trainNumber = readString(row, ['train_number', 'train', 'numero_train', 'trip_code']);
    const stationName =
      readString(row, ['station_name', 'station']) ??
      stationNameById.get(readString(row, ['station_id']) ?? '') ??
      null;
    const time = readString(row, ['time', 'departure_time', 'schedule_time', 'horaire', 'scheduled_time']);

    const lineId = readString(row, ['line_id']);
    const codeCandidate = readString(row, ['line_code', 'line']) ?? (lineId ? lineCodeById.get(lineId) ?? lineId : null);
    const lineCode = toLineCode(codeCandidate);
    const lineName = readString(row, ['line_name']) ?? (lineCode ? `Ligne ${lineCode}` : null);

    if (!trainNumber || !stationName || !time || !lineCode || !lineName) {
      return;
    }

    const direction = readString(row, ['direction', 'sens', 'route_direction']) ?? `Ligne ${lineCode}`;

    const key = [readString(row, ['trip_id', 'service_id', 'schedule_id']), trainNumber, direction, lineCode]
      .filter(Boolean)
      .join('-');

    if (!grouped.has(key)) {
      grouped.set(key, {
        trainNumber,
        direction,
        lineCode,
        lineName,
        stops: [],
      });
    }

    const stopOrder = readNumber(row, ['stop_sequence', 'sequence', 'station_order']) ?? rowIndex;

    grouped.get(key)?.stops.push({ station: normalizeStationName(stationName), time, order: stopOrder });
  });

  return [...grouped.values()]
    .map((trip) => ({
      ...trip,
      stops: trip.stops.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((trip) => trip.stops.length >= 2);
};

const normalizeFares = (rows: Record<string, unknown>[]): FareInfo[] =>
  rows
    .filter(isPublished)
    .map((row) => {
      const lineCode = toLineCode(readString(row, ['line_code', 'line', 'code']));
      const amount = readNumber(row, ['price_tnd', 'amount', 'price', 'fare']);
      const currency = readString(row, ['currency']) ?? 'TND';

      if (!lineCode || amount === null || amount <= 0) {
        return null;
      }

      return {
        lineCode,
        amount,
        currency,
        fareType: readString(row, ['fare_type', 'type']) ?? undefined,
      } satisfies FareInfo;
    })
    .reduce<FareInfo[]>((acc, fare) => {
      if (fare) {
        acc.push(fare);
      }
      return acc;
    }, []);

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
      fares: await loadFaresFromCsv(),
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
        stationNameById.set(id, normalizeStationName(name));
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
    const fares = normalizeFares(faresRows);

    if (stations.length > 0 && supabaseTrips.length > 0) {
      const linesWithStops = lines.map((line) => ({
        ...line,
        hasStops: publishedLineStations.some((ls) => String(ls['line_id'] ?? '') === line.id),
      }));
      return {
        stations,
        lines: linesWithStops.map(({ hasStops, ...line }) => line),
        trips: supabaseTrips,
        fares,
        source: 'supabase',
      };
    }

    return {
      stations: stations.length > 0 ? stations : STATIONS,
      lines,
      trips: await loadTripsForMarche(marche),
      fares: fares.length > 0 ? fares : await loadFaresFromCsv(),
      source: 'csv',
    };
  } catch {
    return {
      stations: STATIONS,
      lines: [],
      trips: await loadTripsForMarche(marche),
      fares: await loadFaresFromCsv(),
      source: 'csv',
    };
  }
};
