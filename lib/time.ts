import { isDirectionCompatible } from '@/lib/constants';
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
      if (!isDirectionCompatible(trip.direction, departureStation, arrivalStation)) {
        return null;
      }

      const departure = trip.stops.find((stop) => stop.station === departureStation);
      const arrival = trip.stops.find((stop) => stop.station === arrivalStation);
      if (!departure || !arrival) {
        return null;
      }

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
      } satisfies RouteResult;
    })
    .filter((trip): trip is RouteResult => trip !== null)
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));

  return possible.slice(0, 3);
};

export const dateToMinuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();
