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

const parseCsv = (content: string): CsvRow[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith('#'));

  return lines.slice(1).flatMap((line) => {
    const columns = line.split(',').map((value) => value.trim());
    if (columns.length !== 4) {
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
