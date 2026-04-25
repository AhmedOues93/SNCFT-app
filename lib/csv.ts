import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

import { CsvRow, DirectionType, MarcheType, TrainTrip } from '@/types';

const csvFiles: Record<MarcheType, number> = {
  Hiver: require('@/data/csv/banlieue-sud-hiver.csv'),
  Été: require('@/data/csv/banlieue-sud-ete.csv'),
  Ramadan: require('@/data/csv/banlieue-sud-ramadan.csv'),
};

const isDirectionType = (value: string): value is DirectionType =>
  [
    'Tunis → Borj Cedria',
    'Borj Cedria → Tunis',
    'Tunis → Erriadh',
    'Erriadh → Tunis',
  ].includes(value);

const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const toMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

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

const parseCsv = (content: string): CsvRow[] => {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith('#'));

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).flatMap((line) => {
    const columns = splitCsvLine(line);
    if (columns.length < 4) {
      return [];
    }

    const [trainNumber, direction, station, time] = columns;
    if (!trainNumber || !station || !isDirectionType(direction) || !isValidTime(time)) {
      return [];
    }

    return [{ trainNumber, direction, station, time }];
  });
};

export const groupRowsByTrain = (rows: CsvRow[]): TrainTrip[] => {
  const grouped = new Map<string, TrainTrip>();

  rows.forEach((row) => {
    const key = `${row.trainNumber}-${row.direction}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        trainNumber: row.trainNumber,
        direction: row.direction,
        stops: [],
      });
    }

    grouped.get(key)?.stops.push({ station: row.station, time: row.time });
  });

  return [...grouped.values()].map((trip) => ({
    ...trip,
    stops: trip.stops.sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
  }));
};

export const loadTripsForMarche = async (marche: MarcheType): Promise<TrainTrip[]> => {
  const asset = Asset.fromModule(csvFiles[marche]);
  await asset.downloadAsync();
  const content = await FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
  return groupRowsByTrain(parseCsv(content));
};
