import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { APP_DISCLAIMER, DIRECTIONS, MARCHES, STATIONS, isDirectionCompatible } from '@/lib/constants';
import { loadTripsForMarche } from '@/lib/csv';
import { haversineDistanceKm, estimateWalkingMinutes } from '@/lib/location';
import { useSearch } from '@/lib/search-context';
import { dateToMinuteOfDay, findNextTrips } from '@/lib/time';

const formatDateInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function SearchScreen() {
  const router = useRouter();
  const { search, setSearch, setResults } = useSearch();
  const [dateText, setDateText] = useState(formatDateInput(search.date));
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
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJTHH:mm, ex: 2026-04-24T08:30.');
      return;
    }

    if (!arrivalOptions.find((item) => item.name === search.arrival)) {
      Alert.alert('Trajet invalide', 'Ce trajet n\'est pas disponible sur les lignes Banlieue Sud.');
      return;
    }

    const manualWalking = Number(manualWalkingText || '0');
    const walkingMinutes = Number.isNaN(manualWalking) ? 0 : Math.max(0, manualWalking);
    const earliestMinute = dateToMinuteOfDay(date) + walkingMinutes;

    try {
      const trips = await loadTripsForMarche(search.marche);
      const results = findNextTrips(trips, search.departure, search.arrival, earliestMinute);

      setSearch({ ...search, date, walkingMinutes });
      setResults(results);
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
        <Text style={styles.title}>Recherche d'itinéraire</Text>

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

        <Text style={styles.label}>Date et heure (format local)</Text>
        <TextInput value={dateText} onChangeText={setDateText} style={styles.input} autoCapitalize="none" />

        <Text style={styles.label}>Marche</Text>
        <Picker selectedValue={search.marche} onValueChange={(value) => setSearch({ ...search, marche: value })}>
          {MARCHES.map((marche) => (
            <Picker.Item key={marche} label={marche} value={marche} />
          ))}
        </Picker>

        <Pressable style={styles.secondaryBtn} onPress={applyCurrentLocation}>
          <Text style={styles.secondaryText}>Utiliser ma position</Text>
        </Pressable>

        <Text style={styles.label}>Temps de marche (minutes)</Text>
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

const styles = StyleSheet.create(    <Pions = get'   mns = genp<Text styl( backsAsyncColonp<'#eef6ff' },   mns    p<Tepadd   tyl6,epadd   Bottom: 30 },   ="cop<Tewidthtyl5);
heigh p<42 })Sud.Selfp<'c   er'})}>
ginBottom: 12 },   <Carp<Tewidthty'100%';
heigh p<17);
borderRadiustyl6,e}>
ginBottom: 16 },    d'itp<Texns S   30.2 }xns Weigh p<'700';
colonp<'#0b5ed7'})}>
ginBottom: 12 },   marchp<Texns S   3014;
colonp<'#334155'})}>
ginTop: 8 },   >

  :onst neborderWidthtyl,st neborderColonp<'#cbd5e1',st neborderRadiustyl2,st nepadd   Horizns =ltyl2,st nepadd   Vharic=ltyl0,st ne}>
ginTop: 6,st },   ess={runSep<TebacksAsyncColonp<'#0b5ed7'})padd   tyl4;
borderRadiustyl2})}>
ginTop: 16 },   uver les prp<Tecolonp<'#fff', dateASud.p<'c   er'})xns Weigh p<'700' },   Press={apply:onst nebacksAsyncColonp<'#198754',st nepadd   tyl2,st neborderRadiustyl2,st ne}>
ginTop: 10,st },   tiliser ma pop<Tecolonp<'#fff', dateASud.p<'c   er'})xns Weigh p<'600' },   _DISCLAIMEp<Tecolonp<'#475569'})xns S   3012})}>
ginTop: 4, dateASud.p<'c   er' }, 
   