import { FareInfo, JourneySegment, LineFilter, RouteResult, TrainTrip } from '@/types';
import { calculateDuration, toMinutes } from '@/lib/time';

const MINUTES_PER_DAY = 24 * 60;
const MAX_RESULTS = 10;

interface JourneyState {
  currentStation: string;
  currentAbsoluteMinute: number;
  segments: JourneySegment[];
  transferWaitingMinutes: number;
  visitedStations: Set<string>;
}

interface RankedJourney {
  result: RouteResult;
  arrivalAbsoluteMinute: number;
}

const normalizeModulo = (minute: number): number => ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

const toAbsoluteMinute = (minuteOfDay: number, minAbsolute: number): number => {
  let absolute = minuteOfDay;
  while (absolute < minAbsolute) {
    absolute += MINUTES_PER_DAY;
  }
  return absolute;
};

const formatTime = (absoluteMinute: number): string => {
  const minute = normalizeModulo(absoluteMinute);
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minute % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

const getFareEstimate = (fares: FareInfo[], segments: JourneySegment[]): { amount?: number; currency?: string } => {
  if (fares.length === 0) {
    return {};
  }

  const total = segments.reduce((sum, segment) => {
    const fare = fares.find((item) => item.lineCode === segment.lineCode);
    return sum + (fare?.amount ?? 0);
  }, 0);

  if (!total) {
    return {};
  }

  return { amount: total, currency: 'TND' };
};

const buildPossibleSegments = (
  trips: TrainTrip[],
  lineFilter: LineFilter,
): Map<string, JourneySegment[]> => {
  const byDeparture = new Map<string, JourneySegment[]>();

  trips
    .filter((trip) => lineFilter === 'ALL' || trip.lineCode === lineFilter)
    .forEach((trip) => {
      trip.stops.forEach((departureStop, departureIndex) => {
        for (let arrivalIndex = departureIndex + 1; arrivalIndex < trip.stops.length; arrivalIndex += 1) {
          const arrivalStop = trip.stops[arrivalIndex];
          const durationMinutes = calculateDuration(departureStop.time, arrivalStop.time);

          if (durationMinutes <= 0) {
            continue;
          }

          const segment: JourneySegment = {
            lineCode: trip.lineCode,
            lineName: trip.lineName,
            trainNumber: trip.trainNumber,
            direction: trip.direction,
            departureStation: departureStop.station,
            arrivalStation: arrivalStop.station,
            departureTime: departureStop.time,
            arrivalTime: arrivalStop.time,
            durationMinutes,
            intermediateStops: trip.stops.slice(departureIndex + 1, arrivalIndex).map((stop) => stop.station),
          };

          const list = byDeparture.get(segment.departureStation) ?? [];
          list.push(segment);
          byDeparture.set(segment.departureStation, list);
        }
      });
    });

  return byDeparture;
};

export const findJourneys = ({
  trips,
  fares,
  departure,
  arrival,
  earliestMinute,
  walkingMinutes,
  lineFilter,
  maxTransfers = 2,
  minTransferMinutes = 5,
}: {
  trips: TrainTrip[];
  fares: FareInfo[];
  departure: string;
  arrival: string;
  earliestMinute: number;
  walkingMinutes: number;
  lineFilter: LineFilter;
  maxTransfers?: number;
  minTransferMinutes?: number;
}): RouteResult[] => {
  const firstAllowedMinute = normalizeModulo(earliestMinute + walkingMinutes);
  const byDeparture = buildPossibleSegments(trips, lineFilter);

  const results: RankedJourney[] = [];
  const queue: JourneyState[] = [
    {
      currentStation: departure,
      currentAbsoluteMinute: firstAllowedMinute,
      segments: [],
      transferWaitingMinutes: 0,
      visitedStations: new Set([departure]),
    },
  ];

  while (queue.length > 0) {
    const state = queue.shift() as JourneyState;
    const nextSegments = byDeparture.get(state.currentStation) ?? [];

    nextSegments.forEach((segment) => {
      if (state.visitedStations.has(segment.arrivalStation)) {
        return;
      }

      const minBoardingMinute =
        state.segments.length === 0
          ? state.currentAbsoluteMinute
          : state.currentAbsoluteMinute + minTransferMinutes;

      const departureAbsoluteMinute = toAbsoluteMinute(toMinutes(segment.departureTime), minBoardingMinute);
      const arrivalAbsoluteMinute = departureAbsoluteMinute + segment.durationMinutes;

      const waitBeforeBoarding = Math.max(0, departureAbsoluteMinute - state.currentAbsoluteMinute);

      const nextState: JourneyState = {
        currentStation: segment.arrivalStation,
        currentAbsoluteMinute: arrivalAbsoluteMinute,
        segments: [...state.segments, segment],
        transferWaitingMinutes:
          state.transferWaitingMinutes + (state.segments.length === 0 ? 0 : waitBeforeBoarding),
        visitedStations: new Set([...state.visitedStations, segment.arrivalStation]),
      };

      if (segment.arrivalStation === arrival) {
        const firstDepartureAbs = departureAbsoluteMinuteForFirstSegment(firstAllowedMinute, nextState.segments[0]);
        const totalMinutes = arrivalAbsoluteMinute - firstDepartureAbs + walkingMinutes;
        const fare = getFareEstimate(fares, nextState.segments);

        results.push({
          arrivalAbsoluteMinute,
          result: {
          id: `${nextState.segments.map((item) => `${item.lineCode}-${item.trainNumber}`).join('|')}-${formatTime(firstDepartureAbs)}-${formatTime(arrivalAbsoluteMinute)}`,
          departureStation: departure,
          arrivalStation: arrival,
          departureTime: formatTime(firstDepartureAbs),
          arrivalTime: formatTime(arrivalAbsoluteMinute),
          durationMinutes: arrivalAbsoluteMinute - firstDepartureAbs,
          transferCount: Math.max(0, nextState.segments.length - 1),
          transferWaitingMinutes: nextState.transferWaitingMinutes,
          walkingMinutes,
          totalMinutes,
          segments: nextState.segments,
          fareAmount: fare.amount,
          fareCurrency: fare.currency,
          trainNumber: nextState.segments[0]?.trainNumber,
          },
        });
        return;
      }

      if (nextState.segments.length < maxTransfers + 1) {
        queue.push(nextState);
      }
    });
  }

  const deduped = new Map<string, RankedJourney>();
  results.forEach((ranked) => {
    const key = `${ranked.result.departureTime}-${ranked.result.arrivalTime}-${ranked.result.segments.map((segment) => `${segment.lineCode}-${segment.trainNumber}`).join('|')}`;
    if (!deduped.has(key)) {
      deduped.set(key, ranked);
    }
  });

  return [...deduped.values()]
    .sort((a, b) => {
      const arrivalDiff = a.arrivalAbsoluteMinute - b.arrivalAbsoluteMinute;
      if (arrivalDiff !== 0) {
        return arrivalDiff;
      }

      if (a.result.transferCount !== b.result.transferCount) {
        return a.result.transferCount - b.result.transferCount;
      }

      return a.result.totalMinutes - b.result.totalMinutes;
    })
    .map((ranked) => ranked.result)
    .slice(0, MAX_RESULTS);
};

const departureAbsoluteMinuteForFirstSegment = (firstAllowedMinute: number, segment: JourneySegment): number =>
  toAbsoluteMinute(toMinutes(segment.departureTime), firstAllowedMinute);
