import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Card } from '@/components/Card';
import {
  APP_DISCLAIMER,
  DIRECTIONS_BY_TRAVEL_DIRECTION,
  MARCHES,
  SNCFT_COLORS,
  STATIONS,
  TRAVEL_DIRECTIONS,
} from '@/lib/constants';
import { createFavoriteId, loadFavorites, saveFavorites } from '@/lib/favorites';
import { haversineDistanceKm, estimateWalkingMinutes } from '@/lib/location';
import { useSearch } from '@/lib/search-context';
import { findFareForRoute, loadTransitData, SupabaseFare } from '@/lib/supabase-services';
import { dateToMinuteOfDay, findNextTrips, formatDateFr } from '@/lib/time';
import { FavoriteRoute, StationInfo, TrainTrip, TravelDirection } from '@/types';

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const LINE_OPTIONS = [
  { code: 'A', label: 'Banlieue Sud' },
  { code: 'D', label: 'Goubaa' },
  { code: 'E', label: 'Bougatfa' },
] as const;

const isDirectionForTravel = (direction: string, travelDirection: TravelDirection): boolean => {
  const directionSet = DIRECTIONS_BY_TRAVEL_DIRECTION[travelDirection];
  return directionSet.includes(direction as (typeof directionSet)[number]);
};

const getArrivalsFor = (
  departure: string,
  travelDirection: TravelDirection,
  stations: StationInfo[],
  trips: TrainTrip[],
  lineCode: 'A' | 'D' | 'E',
): string[] => {
  const lineFilteredTrips = trips.filter((trip) => !trip.lineCode || trip.lineCode === lineCode);
  const byTrips = stations
    .filter((station) => station.name !== departure)
    .map((station) => station.name)
    .filter((arrival) =>
      lineFilteredTrips.some((trip) => {
        if (!isDirectionForTravel(trip.direction, travelDirection)) {
          return false;
        }

        const departureIndex = trip.stops.findIndex((stop) => stop.station === departure);
        const arrivalIndex = trip.stops.findIndex((stop) => stop.station === arrival);

        return departureIndex >= 0 && arrivalIndex > departureIndex;
      }),
    );

  return byTrips;
};

export default function SearchScreen() {
  const router = useRouter();
  const { search, setSearch, setResults, setSelectedResult } = useSearch();

  const [dateText, setDateText] = useState(search.date.toISOString().slice(0, 10));
  const [selectedHour, setSelectedHour] = useState(search.date.getHours().toString().padStart(2, '0'));
  const [selectedMinute, setSelectedMinute] = useState(search.date.getMinutes().toString().padStart(2, '0'));
  const [manualWalkingText, setManualWalkingText] = useState(String(search.walkingMinutes || ''));
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [stations, setStations] = useState<StationInfo[]>(STATIONS);
  const [trips, setTrips] = useState<TrainTrip[]>([]);
  const [fares, setFares] = useState<SupabaseFare[]>([]);
  const [sourceLabel, setSourceLabel] = useState<'supabase' | 'csv'>('csv');

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  useEffect(() => {
    loadTransitData(search.marche).then((result) => {
      setStations(result.stations.length > 0 ? result.stations : STATIONS);
      setTrips(result.trips);
      setFares(result.fares);
      setSourceLabel(result.source);
    });
  }, [search.marche]);

  const arrivalOptions = useMemo(
    () => getArrivalsFor(search.departure, search.travelDirection, stations, trips, search.lineCode),
    [search.departure, search.travelDirection, stations, trips, search.lineCode],
  );

  const applyCurrentLocation = async () => {
    const departureStation = stations.find((item) => item.name === search.departure);
    if (!departureStation) {
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS non autorisé', 'Veuillez saisir un temps de marche manuel.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const distance = haversineDistanceKm(
        location.coords.latitude,
        location.coords.longitude,
        departureStation.lat,
        departureStation.lon,
      );

      const walkingMinutes = estimateWalkingMinutes(distance);
      setSearch({ ...search, walkingMinutes });
      setManualWalkingText(String(walkingMinutes));
    } catch {
      Alert.alert('Position indisponible', "Impossible d'obtenir votre position. Saisissez un temps de marche manuel.");
    }
  };

  const swapStations = () => {
    const nextDeparture = search.arrival;
    const nextDirection: TravelDirection = search.travelDirection === 'Aller' ? 'Retour' : 'Aller';
    const possibleArrivals = getArrivalsFor(nextDeparture, nextDirection, stations, trips, search.lineCode);
    if (!possibleArrivals.includes(search.departure)) {
      setValidationMessage('Impossible d’inverser ce trajet pour le sens choisi.');
      return;
    }

    setValidationMessage('');
    setSearch({
      ...search,
      departure: nextDeparture,
      arrival: search.departure,
      travelDirection: nextDirection,
    });
  };

  const persistFavorites = async (nextFavorites: FavoriteRoute[]) => {
    setFavorites(nextFavorites);
    await saveFavorites(nextFavorites);
  };

  const addCurrentToFavorites = async () => {
    if (search.departure === search.arrival) {
      setValidationMessage('Le départ et l’arrivée doivent être différents.');
      return;
    }

    const exists = favorites.some(
      (favorite) => favorite.departure === search.departure && favorite.arrival === search.arrival,
    );
    if (exists) {
      return;
    }

    const nextFavorites = [
      { id: createFavoriteId(search.departure, search.arrival), departure: search.departure, arrival: search.arrival },
      ...favorites,
    ].slice(0, 8);

    await persistFavorites(nextFavorites);
  };

  const applyFavorite = (favorite: FavoriteRoute) => {
    const nextDirection: TravelDirection = trips.some((trip) => {
      if (!isDirectionForTravel(trip.direction, 'Aller')) {
        return false;
      }
      const dep = trip.stops.findIndex((stop) => stop.station === favorite.departure);
      const arr = trip.stops.findIndex((stop) => stop.station === favorite.arrival);
      return dep >= 0 && arr > dep;
    })
      ? 'Aller'
      : 'Retour';

    setSearch({ ...search, departure: favorite.departure, arrival: favorite.arrival, travelDirection: nextDirection });
    setValidationMessage('');
  };

  const runSearch = async () => {
    const date = new Date(`${dateText}T${selectedHour}:${selectedMinute}:00`);
    if (Number.isNaN(date.getTime())) {
      setValidationMessage('Date ou heure invalide. Utilisez le format AAAA-MM-JJ.');
      return;
    }

    if (!arrivalOptions.includes(search.arrival)) {
      setValidationMessage('Trajet invalide pour ce sens. Choisissez une arrivée compatible.');
      return;
    }

    const manualWalking = Number(manualWalkingText || '0');
    const walkingMinutes = Number.isNaN(manualWalking) ? 0 : Math.max(0, manualWalking);

    const earliestMinute = dateToMinuteOfDay(date) + walkingMinutes;

    const filteredTrips = trips.filter((trip) => !trip.lineCode || trip.lineCode === search.lineCode);
    const nextTrips = findNextTrips(filteredTrips, search.departure, search.arrival, earliestMinute, walkingMinutes).map(
      (result) => {
        const fare = findFareForRoute(fares, result.departureStation, result.arrivalStation);
        return {
          ...result,
          fareAmount: fare?.amount,
          fareCurrency: fare?.currency,
        };
      },
    );

    setSearch({ ...search, date, walkingMinutes });
    setResults(nextTrips);
    setSelectedResult(nextTrips[0] ?? null);
    setValidationMessage(
      nextTrips.length === 0
        ? 'Aucun train trouvé. Essayez une heure plus tôt ou changez le sens/marche.'
        : '',
    );
    router.push('/(tabs)/resultats');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Image source={require('@/assets/images/sncft-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.today}>{formatDateFr(new Date())}</Text>
        <Text style={styles.source}>
          Source des données: {sourceLabel === 'supabase' ? 'Supabase' : 'CSV local (secours)'}
        </Text>
      </View>

      <Image source={require('@/assets/images/train-hero.jpg')} style={styles.hero} resizeMode="cover" />

      <Card style={styles.mainCard}>
        <Text style={styles.title}>Planifier votre trajet</Text>

        <Text style={styles.label}>Ligne</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={search.lineCode} onValueChange={(value) => setSearch({ ...search, lineCode: value })}>
            {LINE_OPTIONS.map((line) => (
              <Picker.Item key={line.code} label={line.label} value={line.code} />
            ))}
          </Picker>
        </View>

        <View style={styles.rowTop}>
          <View style={styles.flexOne}>
            <Text style={styles.label}>Date</Text>
            <TextInput value={dateText} onChangeText={setDateText} style={styles.input} placeholder="AAAA-MM-JJ" />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.label}>Sens</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={search.travelDirection}
                onValueChange={(value) => {
                  const nextDirection = value as TravelDirection;
                  const arrivals = getArrivalsFor(search.departure, nextDirection, stations, trips, search.lineCode);
                  const nextArrival = arrivals.includes(search.arrival) ? search.arrival : arrivals[0] ?? search.arrival;
                  setSearch({ ...search, travelDirection: nextDirection, arrival: nextArrival });
                }}
              >
                {TRAVEL_DIRECTIONS.map((direction) => (
                  <Picker.Item key={direction} label={direction} value={direction} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Départ</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={search.departure}
            onValueChange={(value) => {
              const arrivals = getArrivalsFor(value, search.travelDirection, stations, trips, search.lineCode);
              const nextArrival = arrivals.includes(search.arrival) ? search.arrival : arrivals[0] ?? search.arrival;
              setSearch({ ...search, departure: value, arrival: nextArrival });
            }}
          >
            {stations.map((station) => (
              <Picker.Item key={station.name} label={station.name} value={station.name} />
            ))}
          </Picker>
        </View>

        <Pressable style={styles.swapBtn} onPress={swapStations}>
          <Text style={styles.swapBtnText}>⇅ Inverser départ/arrivée</Text>
        </Pressable>

        <Text style={styles.label}>Arrivée</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={search.arrival} onValueChange={(value) => setSearch({ ...search, arrival: value })}>
            {arrivalOptions.map((stationName) => (
              <Picker.Item key={stationName} label={stationName} value={stationName} />
            ))}
          </Picker>
        </View>

        <Text style={styles.hint}>Arrêts intermédiaires et tarif affichés dans les résultats.</Text>

        <Text style={styles.label}>Heure souhaitée</Text>
        <View style={styles.timeRow}>
          <View style={styles.timePickerWrap}>
            <Picker selectedValue={selectedHour} onValueChange={setSelectedHour}>
              {HOURS.map((hour) => (
                <Picker.Item key={hour} label={`${hour} h`} value={hour} />
              ))}
            </Picker>
          </View>
          <View style={styles.timePickerWrap}>
            <Picker selectedValue={selectedMinute} onValueChange={setSelectedMinute}>
              {MINUTES.map((minute) => (
                <Picker.Item key={minute} label={`${minute} min`} value={minute} />
              ))}
            </Picker>
          </View>
        </View>

        <Text style={styles.label}>Marche</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={search.marche} onValueChange={(value) => setSearch({ ...search, marche: value })}>
            {MARCHES.map((marche) => (
              <Picker.Item key={marche} label={marche} value={marche} />
            ))}
          </Picker>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={applyCurrentLocation}>
            <Text style={styles.secondaryText}>Utiliser ma position</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={addCurrentToFavorites}>
            <Text style={styles.outlineText}>Ajouter en favori</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Temps de marche manuel (minutes)</Text>
        <TextInput
          value={manualWalkingText}
          onChangeText={setManualWalkingText}
          keyboardType="numeric"
          style={styles.input}
        />

        {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={runSearch}>
          <Text style={styles.primaryText}>Trouver les prochains trains</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.favTitle}>Favoris</Text>
        {favorites.length === 0 ? (
          <Text style={styles.emptyFav}>Aucun favori enregistré pour le moment.</Text>
        ) : (
          favorites.map((favorite) => (
            <Pressable key={favorite.id} onPress={() => applyFavorite(favorite)} style={styles.favItem}>
              <Text style={styles.favText}>
                {favorite.departure} → {favorite.arrival}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16, paddingBottom: 30 },
  headerBlock: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 180, height: 50 },
  today: { color: SNCFT_COLORS.muted, textTransform: 'capitalize', marginTop: 2, fontWeight: '600' },
  source: { color: '#1e40af', fontWeight: '600', fontSize: 12, marginTop: 2 },
  hero: { width: '100%', height: 220, borderRadius: 18, marginBottom: 14 },
  mainCard: { marginTop: -6 },
  title: { fontSize: 24, fontWeight: '800', color: SNCFT_COLORS.primary, marginBottom: 12 },
  rowTop: { flexDirection: 'row', gap: 10 },
  flexOne: { flex: 1 },
  label: { fontSize: 14, color: '#334155', marginTop: 8, fontWeight: '600' },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: 6,
  },
  hint: { color: SNCFT_COLORS.muted, marginTop: 6, fontSize: 12 },
  timeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  timePickerWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: { flex: 1, backgroundColor: SNCFT_COLORS.secondary, padding: 12, borderRadius: 12 },
  secondaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: SNCFT_COLORS.primary,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  outlineText: { color: SNCFT_COLORS.primary, textAlign: 'center', fontWeight: '700' },
  primaryBtn: { backgroundColor: SNCFT_COLORS.primary, padding: 15, borderRadius: 12, marginTop: 14 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  validation: { marginTop: 8, color: '#b91c1c', fontWeight: '600' },
  swapBtn: { marginTop: 10, paddingVertical: 8 },
  swapBtnText: { color: SNCFT_COLORS.primary, textAlign: 'center', fontWeight: '700' },
  favTitle: { fontSize: 18, color: SNCFT_COLORS.text, fontWeight: '700', marginBottom: 8 },
  emptyFav: { color: SNCFT_COLORS.muted },
  favItem: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  favText: { color: SNCFT_COLORS.text, fontWeight: '600' },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
