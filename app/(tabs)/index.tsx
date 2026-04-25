import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER, DIRECTIONS, MARCHES, STATIONS, isDirectionCompatible } from '@/lib/constants';
import { loadTripsForMarche } from '@/lib/csv';
import { haversineDistanceKm, estimateWalkingMinutes } from '@/lib/location';
import { useSearch } from '@/lib/search-context';
import { dateToMinuteOfDay, findNextTrips } from '@/lib/time';

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export default function SearchScreen() {
  const router = useRouter();
  const { search, setSearch, setResults, setSelectedResult } = useSearch();
  const [selectedHour, setSelectedHour] = useState(search.date.getHours().toString().padStart(2, '0'));
  const [selectedMinute, setSelectedMinute] = useState(search.date.getMinutes().toString().padStart(2, '0'));
  const [manualWalkingText, setManualWalkingText] = useState(String(search.walkingMinutes || ''));

  const arrivalOptions = useMemo(
    () =>
      STATIONS.filter(
        (station) =>
          station.name !== search.departure &&
          DIRECTIONS.some((direction) => isDirectionCompatible(direction, search.departure, station.name)),
      ),
    [search.departure],
  );

  const getArrivalOptionsForDeparture = (departure: string) =>
    STATIONS.filter(
      (station) =>
        station.name !== departure &&
        DIRECTIONS.some((direction) => isDirectionCompatible(direction, departure, station.name)),
    );

  const applyCurrentLocation = async () => {
    const departureStation = STATIONS.find((item) => item.name === search.departure);
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

  const runSearch = async () => {
    if (!arrivalOptions.find((item) => item.name === search.arrival)) {
      Alert.alert('Trajet invalide', "Ce trajet n'est pas disponible sur les lignes Banlieue Sud.");
      return;
    }

    const manualWalking = Number(manualWalkingText || '0');
    const walkingMinutes = Number.isNaN(manualWalking) ? 0 : Math.max(0, manualWalking);

    const date = new Date(search.date);
    date.setHours(Number(selectedHour), Number(selectedMinute), 0, 0);

    const earliestMinute = dateToMinuteOfDay(date) + walkingMinutes;

    try {
      const trips = await loadTripsForMarche(search.marche);
      const nextTrips = findNextTrips(
        trips,
        search.departure,
        search.arrival,
        earliestMinute,
        walkingMinutes,
      );

      setSearch({ ...search, date, walkingMinutes });
      setResults(nextTrips);
      setSelectedResult(nextTrips[0] ?? null);
      router.push('/(tabs)/resultats');
    } catch {
      Alert.alert('Erreur de chargement', 'Impossible de charger les horaires CSV.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('@/assets/images/sncft-logo.png')} style={styles.logo} resizeMode="contain" />
      <Image source={require('@/assets/images/train-hero.jpg')} style={styles.hero} />

      <Card>
        <Text style={styles.title}>Recherche d&apos;itinéraire</Text>

        <Text style={styles.label}>Départ</Text>
        <Picker
          selectedValue={search.departure}
          onValueChange={(value) => {
            const nextArrivalOptions = getArrivalOptionsForDeparture(value);
            const nextArrival =
              value === search.arrival || !nextArrivalOptions.find((s) => s.name === search.arrival)
                ? nextArrivalOptions[0]?.name ?? 'Borj Cedria'
                : search.arrival;
            setSearch({ ...search, departure: value, arrival: nextArrival });
          }}
        >
          {STATIONS.map((station) => (
            <Picker.Item key={station.name} label={station.name} value={station.name} />
          ))}
        </Picker>

        <Text style={styles.label}>Arrivée</Text>
        <Picker selectedValue={search.arrival} onValueChange={(value) => setSearch({ ...search, arrival: value })}>
          {arrivalOptions.map((station) => (
            <Picker.Item key={station.name} label={station.name} value={station.name} />
          ))}
        </Picker>

        <Text style={styles.label}>Heure de départ souhaitée</Text>
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
        <Picker selectedValue={search.marche} onValueChange={(value) => setSearch({ ...search, marche: value })}>
          {MARCHES.map((marche) => (
            <Picker.Item key={marche} label={marche} value={marche} />
          ))}
        </Picker>

        <Pressable style={styles.secondaryBtn} onPress={applyCurrentLocation}>
          <Text style={styles.secondaryText}>Utiliser ma position</Text>
        </Pressable>

        <Text style={styles.label}>Temps de marche manuel (minutes)</Text>
        <TextInput
          value={manualWalkingText}
          onChangeText={setManualWalkingText}
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable style={styles.primaryBtn} onPress={runSearch}>
          <Text style={styles.primaryText}>Trouver les prochains trains</Text>
        </Pressable>
      </Card>

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16, paddingBottom: 30 },
  logo: { width: 150, height: 42, alignSelf: 'center', marginBottom: 12 },
  hero: { width: '100%', height: 170, borderRadius: 16, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7', marginBottom: 12 },
  label: { fontSize: 14, color: '#334155', marginTop: 8 },
  timeRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  timePickerWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  primaryBtn: { backgroundColor: '#0b5ed7', padding: 14, borderRadius: 12, marginTop: 16 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#198754', padding: 12, borderRadius: 12, marginTop: 10 },
  secondaryText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
