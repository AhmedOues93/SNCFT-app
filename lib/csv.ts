import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

import { CsvRow, FareInfo, LineCode, MarcheType, TrainTrip } from '@/types';
import { normalizeStationName } from '@/lib/station-name';

const scheduleFiles: Array<{ lineCode: LineCode; lineName: string; file: number }> = [
  {
    lineCode: 'A',
    lineName: 'Banlieue Sud',
    file: require('@/data/schedules/line_A_banlieue_sud_hiver_2025_schedules.csv'),
  },
  {
    lineCode: 'D',
    lineName: 'Goubaa',
    file: require('@/data/schedules/schedules_line_D_goubaa.csv'),
  },
  {
    lineCode: 'E',
    lineName: 'Bougatfa',
    file: require('@/data/schedules/schedules_line_E_bougatfa.csv'),
  },
];

const faresFiles: Array<{ lineCode: LineCode; file: number }> = [
  { lineCode: 'A', file: require('@/data/fares/fares_line_A_banlieue_sud.csv') },
  { lineCode: 'D', file: require('@/data/fares/fares_line_D_goubaa.csv') },
  { lineCode: 'E', file: require('@/data/fares/fares_line_E_bougatfa.csv') },
];

const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const parseCsvObjects = (content: string): Record<string, string>[] => {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith('#'));

  if (lines.length <= 1) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line) => {
    const columns = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? '';
    });
    return row;
  });
};

const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const normalizeScheduleRows = (rows: Record<string, string>[], lineCode: LineCode, lineName: string): CsvRow[] =>
  rows
    .map((row) => {
      const trainNumber = row.train_number || row.train || row.numero_train;
      const direction = row.direction || row.sens || '';
      const station = normalizeStationName(row.station || row.station_name || row.station_code || '');
      const time = row.time || row.departure_time || row.scheduled_time || row.horaire || '';
      const stationOrder = Number(row.station_order || row.stop_sequence || row.sequence || '0');

      if (!trainNumber || !direction || !station || !isValidTime(time)) {
        return null;
      }

      return {
        lineCode,
        lineName,
        direction,
        trainNumber,
        station,
        time,
        stationOrder: Number.isNaN(stationOrder) ? 0 : stationOrder,
      } satisfies CsvRow;
    })
    .filter((row): row is CsvRow => row !== null);

const groupRowsByTrain = (rows: CsvRow[]): TrainTrip[] => {
  const grouped = new Map<string, TrainTrip>();

  rows.forEach((row) => {
    const key = `${row.lineCode}-${row.trainNumber}-${row.direction}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        lineCode: row.lineCode,
        lineName: row.lineName,
        trainNumber: row.trainNumber,
        direction: row.direction,
        stops: [],
      });
    }

    grouped.get(key)?.stops.push({ station: row.station, time: row.time, order: row.stationOrder });
  });

  return [...grouped.values()]
    .map((trip) => ({
      ...trip,
      stops: trip.stops.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((trip) => trip.stops.length >= 2);
};

const readAssetAsString = async (moduleId: number): Promise<string> => {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
};

export const loadTripsForMarche = async (_marche: MarcheType): Promise<TrainTrip[]> => {
  const allRows = await Promise.all(
    scheduleFiles.map(async ({ lineCode, lineName, file }) => {
      const content = await readAssetAsString(file);
      return normalizeScheduleRows(parseCsvObjects(content), lineCode, lineName);
    }),
  );

  return groupRowsByTrain(allRows.flat());
};

export const loadFaresFromCsv = async (): Promise<FareInfo[]> => {
  const fares = await Promise.all(
    faresFiles.map(async ({ lineCode, file }) => {
      const content = await readAssetAsString(file);
      const rows = parseCsvObjects(content);
      const row =
        rows.find((item) => (item.fare_type || '').toLowerCase().includes('plein tarif')) ??
        rows.find((item) => Boolean(item.price_tnd || item.price));

      if (!row) {
        return null;
      }

      const amount = Number(row.price_tnd || row.price || row.amount || '0');
      if (Number.isNaN(amount) || amount <= 0) {
        return null;
      }

      return {
        lineCode,
        amount,
        currency: 'TND',
        fareType: row.fare_type,
      } satisfies FareInfo;
    }),
  );

  return fares.reduce<FareInfo[]>((acc, fare) => {
    if (fare) {
      acc.push(fare);
    }
    return acc;
  }, []);
};
