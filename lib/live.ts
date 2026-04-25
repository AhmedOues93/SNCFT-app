import { supabase } from '@/lib/supabase';
import { haversineDistanceKm } from '@/lib/location';
import { loadTransitData } from '@/lib/supabase-services';
import { dateToMinuteOfDay, toMinutes } from '@/lib/time';

export interface LiveTrainStatus {
  train_id: string;
  next_station: string | null;
  delay_minutes: number | null;
  status: string | null;
  updated_at: string;
  last_speed: number | null;
}

const inferSeason = (): 'Hiver' | 'Été' | 'Ramadan' => {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) {
    return 'Été';
  }
  return 'Hiver';
};

const computeDelayEstimate = async (trainId: string, lat: number, lng: number) => {
  const season = inferSeason();
  const data = await loadTransitData(season);
  const trip = data.trips.find((item) => item.trainNumber === trainId);

  if (!trip || trip.stops.length === 0) {
    return { nextStation: null, delayMinutes: null };
  }

  const stationByName = new Map(data.stations.map((station) => [station.name, station]));
  const nearest = trip.stops
    .map((stop, idx) => {
      const station = stationByName.get(stop.station);
      if (!station) {
        return null;
      }
      return {
        idx,
        stationName: stop.station,
        distance: haversineDistanceKm(lat, lng, station.lat, station.lon),
      };
    })
    .filter((item): item is { idx: number; stationName: string; distance: number } => item !== null)
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest) {
    return { nextStation: null, delayMinutes: null };
  }

  const nextStop = trip.stops[Math.min(nearest.idx + 1, trip.stops.length - 1)];
  const nowMinutes = dateToMinuteOfDay(new Date());
  const scheduledMinutes = toMinutes(nextStop.time);

  return {
    nextStation: nextStop.station,
    delayMinutes: nowMinutes - scheduledMinutes,
  };
};

export const sendTrainPosition = async (params: {
  trainId: string;
  lat: number;
  lng: number;
  speed: number | null;
}) => {
  if (!supabase) {
    return { ok: false, message: 'Supabase non configuré' };
  }

  const { trainId, lat, lng, speed } = params;
  const nowIso = new Date().toISOString();

  const { error: posError } = await supabase.from('train_positions').insert({
    train_id: trainId,
    lat,
    lng,
    speed,
    recorded_at: nowIso,
  });

  if (posError) {
    return { ok: false, message: posError.message };
  }

  const estimate = await computeDelayEstimate(trainId, lat, lng);
  const status = (speed ?? 0) > 5 ? 'En mouvement' : 'À l’arrêt';

  const { error: statusError } = await supabase.from('live_train_status').upsert(
    {
      train_id: trainId,
      next_station: estimate.nextStation,
      delay_minutes: estimate.delayMinutes,
      status,
      updated_at: nowIso,
      last_speed: speed,
    },
    { onConflict: 'train_id' },
  );

  if (statusError) {
    return { ok: false, message: statusError.message };
  }

  return { ok: true, message: 'Position envoyée' };
};

export const fetchLiveTrainStatus = async (trainId: string): Promise<LiveTrainStatus | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('live_train_status')
    .select('*')
    .eq('train_id', trainId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LiveTrainStatus;
};
