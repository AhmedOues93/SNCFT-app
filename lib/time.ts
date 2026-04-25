import { RouteResult, TrainTrip } from '@/types';

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const calculateDuration = (start: string, end: string): number => {
  const diff = toMinutes(end) - toMinutes(start);
  return diff >= 0 ? diff : diff + 24 * 60;
};

export const findNextTrips = (
  trips: TrainTrip[],
  departureStation: string,
  arrivalStation: string,
  earliestMinute: number,
  walkingMinutes: number,
): RouteResult[] => {
  const normalizedEarliestMinute = ((earliestMinute % (24 * 60)) + 24 * 60) % (24 * 60);

  const possible = trips
    .map((trip) => {
      const departureIndex = trip.stops.findIndex((stop) => stop.station === departureStation);
      const arrivalIndex = trip.stops.findIndex((stop) => stop.station === arrivalStation);

      if (departureIndex < 0 || arrivalIndex <= departureIndex) {
        return null;
      }

      const departure = trip.stops[departureIndex];
      const arrival = trip.stops[arrivalIndex];
      const departureMinute = toMinutes(departure.time);
      const arrivalMinute = toMinutes(arrival.time);

      if (arrivalMinute <= departureMinute || departureMinute < normalizedEarliestMinute) {
        return null;
      }

      return {
        trainNumber: trip.trainNumber,
        direction: trip.direction,
        departureTime: departure.time,
        arrivalTime: arrival.time,
        durationMinutes: calculateDuration(departure.time, arrival.time),
        waitingMinutes: departureMinute - normalizedEarliestMinute,
        walkingMinutes,
        departureStation,
        arrivalStation,
        intermediateStops: trip.stops.slice(departureIndex + 1, arrivalIndex).map((stop) => stop.station),
      } satisfies RouteResult;
    })
    .filter((trip): trip is RouteResult => trip !== null)
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));

  return possible.slice(0, 3);
};

export const dateToMinuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export const formatDateFr = (date: Date): string =>
  date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
