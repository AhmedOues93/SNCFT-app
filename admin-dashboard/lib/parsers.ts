import { parseStringPromise } from 'xml2js';

export interface ImportErrorItem {
  row: number;
  message: string;
}

export interface ScheduleDraft {
  train_number: string;
  direction: 'aller' | 'retour';
  season: 'hiver' | 'ete' | 'ramadan';
  station_code: string;
  stop_sequence: number;
  scheduled_time: string;
}

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const parseSchedulesCsv = (content: string) => {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const drafts: ScheduleDraft[] = [];
  const errors: ImportErrorItem[] = [];

  lines.slice(1).forEach((line, index) => {
    const cells = line.split(',').map((item) => item.trim());
    const [train_number, direction, season, station_code, stop_sequence, scheduled_time] = cells;

    if (!train_number) errors.push({ row: index + 2, message: 'Numéro de train manquant' });
    if (!['aller', 'retour'].includes(direction)) errors.push({ row: index + 2, message: 'Direction invalide' });
    if (!['hiver', 'ete', 'ramadan'].includes(season)) errors.push({ row: index + 2, message: 'Saison invalide' });
    if (!isValidTime(scheduled_time || '')) errors.push({ row: index + 2, message: 'Heure invalide' });

    if (train_number && ['aller', 'retour'].includes(direction) && ['hiver', 'ete', 'ramadan'].includes(season) && isValidTime(scheduled_time || '')) {
      drafts.push({
        train_number,
        direction: direction as 'aller' | 'retour',
        season: season as 'hiver' | 'ete' | 'ramadan',
        station_code,
        stop_sequence: Number(stop_sequence),
        scheduled_time,
      });
    }
  });

  return { drafts, errors };
};

export const parseSchedulesXml = async (content: string) => {
  const xml = await parseStringPromise(content, { explicitArray: false });
  const rows = xml?.schedules?.row ? (Array.isArray(xml.schedules.row) ? xml.schedules.row : [xml.schedules.row]) : [];
  const csvLike = ['train_number,direction,season,station_code,stop_sequence,scheduled_time'];

  rows.forEach((row: Record<string, string>) => {
    csvLike.push([
      row.train_number ?? '',
      row.direction ?? '',
      row.season ?? '',
      row.station_code ?? '',
      row.stop_sequence ?? '',
      row.scheduled_time ?? '',
    ].join(','));
  });

  return parseSchedulesCsv(csvLike.join('\n'));
};
