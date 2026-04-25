#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const FILES = {
  schedules: [
    { lineCode: 'A', lineName: 'Banlieue Sud', file: 'data/schedules/line_A_banlieue_sud_hiver_2025_schedules.csv' },
    { lineCode: 'D', lineName: 'Goubaa', file: 'data/schedules/schedules_line_D_goubaa.csv' },
    { lineCode: 'E', lineName: 'Bougatfa', file: 'data/schedules/schedules_line_E_bougatfa.csv' },
  ],
  fares: [
    { lineCode: 'A', lineName: 'Banlieue Sud', file: 'data/fares/fares_line_A_banlieue_sud.csv' },
    { lineCode: 'D', lineName: 'Goubaa', file: 'data/fares/fares_line_D_goubaa.csv' },
    { lineCode: 'E', lineName: 'Bougatfa', file: 'data/fares/fares_line_E_bougatfa.csv' },
  ],
};

const splitCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
};

const parseCsv = (content) => {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = splitCsvLine(lines[0] ?? '').map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
    return obj;
  });
  return { header, rows };
};

const countStats = (rows, stationKey, trainKey) => ({
  rows: rows.length,
  trains: new Set(rows.map((r) => r[trainKey]).filter(Boolean)).size,
  stations: new Set(rows.map((r) => r[stationKey]).filter(Boolean)).size,
});

const fileExists = (rel) => fs.existsSync(path.resolve(rel));

const validateSchedules = (rows) => {
  const errors = [];
  rows.forEach((r, idx) => {
    const time = r.scheduled_time || r.time || r.horaire;
    const train = r.train_number || r.train || r.numero_train;
    const station = r.station || r.station_name || r.station_code;
    if (!train) errors.push(`Ligne ${idx + 2}: train_number manquant`);
    if (!station) errors.push(`Ligne ${idx + 2}: station manquante`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) errors.push(`Ligne ${idx + 2}: heure invalide`);
  });
  return errors;
};

const validateFares = (rows) => {
  const errors = [];
  rows.forEach((r, idx) => {
    const section = r.sections || r.section || r.segment;
    const price = Number(r.price_tnd || r.price || r.amount);
    if (!section) errors.push(`Ligne ${idx + 2}: section manquante`);
    if (Number.isNaN(price)) errors.push(`Ligne ${idx + 2}: prix invalide`);
  });
  return errors;
};

const summarize = () => {
  const report = [];

  for (const item of FILES.schedules) {
    if (!fileExists(item.file)) {
      report.push({ line: item.lineCode, type: 'schedules', file: item.file, missing: true });
      continue;
    }
    const parsed = parseCsv(fs.readFileSync(item.file, 'utf8'));
    const stats = countStats(parsed.rows, 'station', 'train_number');
    const errors = validateSchedules(parsed.rows);
    report.push({ line: item.lineCode, type: 'schedules', file: item.file, missing: false, ...stats, errors: errors.length });
  }

  for (const item of FILES.fares) {
    if (!fileExists(item.file)) {
      report.push({ line: item.lineCode, type: 'fares', file: item.file, missing: true });
      continue;
    }
    const parsed = parseCsv(fs.readFileSync(item.file, 'utf8'));
    const stats = { rows: parsed.rows.length };
    const errors = validateFares(parsed.rows);
    report.push({ line: item.lineCode, type: 'fares', file: item.file, missing: false, ...stats, errors: errors.length });
  }

  return report;
};

const importToSupabase = async () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.log('Supabase non configuré: rapport validation uniquement.');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, anon);

  for (const item of FILES.schedules) {
    if (!fileExists(item.file)) continue;

    const parsed = parseCsv(fs.readFileSync(item.file, 'utf8'));
    const { data: lineRow } = await supabase.from('lines').upsert({ code: item.lineCode, name: item.lineName, is_published: true }, { onConflict: 'code' }).select('id').single();
    if (!lineRow) continue;

    for (const row of parsed.rows) {
      const stationName = row.station || row.station_name || row.station_code;
      const trainNumber = row.train_number || row.train || row.numero_train;
      const direction = (row.direction || 'aller').toLowerCase();
      const season = (row.season || row.marche || 'hiver').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const scheduledTime = row.scheduled_time || row.time || row.horaire;
      const stopSequence = Number(row.stop_sequence || row.sequence || 1);
      if (!stationName || !trainNumber || !scheduledTime) continue;

      const { data: stationRow } = await supabase.from('stations').upsert({ name: stationName, is_published: true }, { onConflict: 'name' }).select('id').single();
      if (!stationRow) continue;

      await supabase.from('line_stations').upsert({
        line_id: lineRow.id,
        station_id: stationRow.id,
        direction: direction === 'retour' ? 'retour' : 'aller',
        stop_sequence: stopSequence,
        is_published: true,
      }, { onConflict: 'line_id,station_id,direction' });

      await supabase.from('schedules').upsert({
        line_id: lineRow.id,
        station_id: stationRow.id,
        direction: direction === 'retour' ? 'retour' : 'aller',
        season: ['hiver', 'ete', 'ramadan'].includes(season) ? season : 'hiver',
        train_number: trainNumber,
        stop_sequence: stopSequence,
        scheduled_time: scheduledTime,
        is_published: true,
      }, { onConflict: 'line_id,direction,season,train_number,stop_sequence,scheduled_time' });
    }
  }

  for (const item of FILES.fares) {
    if (!fileExists(item.file)) continue;
    const parsed = parseCsv(fs.readFileSync(item.file, 'utf8'));
    const { data: lineRow } = await supabase.from('lines').select('id').eq('code', item.lineCode).single();
    if (!lineRow) continue;
    for (const row of parsed.rows) {
      const sections = row.sections || row.section || row.segment;
      const price = Number(row.price_tnd || row.price || row.amount);
      if (!sections || Number.isNaN(price)) continue;
      await supabase.from('fares').upsert({ line_id: lineRow.id, sections, price_tnd: price, is_published: true });
    }
  }

  console.log('Import Supabase terminé (si autorisations RLS compatibles).');
};

const report = summarize();
console.table(report);
await importToSupabase();
