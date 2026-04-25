import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER, MARCHES, SNCFT_COLORS } from '@/lib/constants';
import { createFavoriteId, loadFavorites, saveFavorites } from '@/lib/favorites';
import { findJourneys } from '@/lib/routing';
import { useSearch } from '@/lib/search-context';
import { loadTransitData } from '@/lib/supabase-services';
import { dateToMinuteOfDay, formatDateFr } from '@/lib/time';
import { FavoriteRoute, LineFilter, StationInfo, TrainTrip } from '@/types';

const LINE_OPTIONS: Array<{ value: LineFilter; label: string }> = [
  { value: 'ALL', label: 'Toutes les lignes' },
  { value: 'A', label: 'Ligne A — Banlieue Sud' },
  { value: 'D', label: 'Ligne D — Goubaa' },
  { value: 'E', label: 'Ligne E — Bougatfa' },
];

const getStationsFromTrips = (trips: TrainTrip[]): string[] =>
  [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.station)))].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' }),
  );

const StationPickerModal = ({
  visible,
  title,
  stations,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  stations: string[];
  selected: string;
  onClose: () => void;
  onSelect: (station: string) => void;
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 360 }}>
          {stations.map((station) => {
            const isSelected = station === selected;
            return (
              <Pressable
                key={station}
                style={[styles.modalItem, isSelected ? styles.modalItemActive : undefined]}
                onPress={() => {
                  onSelect(station);
                  onClose();
                }}
              >
                <Text style={[styles.modalItemText, isSelected ? styles.modalItemTextActive : undefined]}>{station}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={styles.modalCloseBtn} onPress={onClose}>
          <Text style={styles.modalCloseText}>Fermer</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

export default function SearchScreen() {
  const router = useRouter();
  const { search, setSearch, setResults, setSelectedResult } = useSearch();

  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [trips, setTrips] = useState<TrainTrip[]>([]);
  const [sourceLabel, setSourceLabel] = useState<'supabase' | 'csv'>('csv');
  const [stationModal, setStationModal] = useState<'departure' | 'arrival' | null>(null);
  const [dateText, setDateText] = useState(search.date.toISOString().slice(0, 10));
  const [timeText, setTimeText] = useState(
    `${search.date.getHours().toString().padStart(2, '0')}:${search.date.getMinutes().toString().padStart(2, '0')}`,
  );

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  useEffect(() => {
    loadTransitData(search.marche).then((result) => {
      setStations(result.stations);
      setTrips(result.trips);
      setSourceLabel(result.source);
    });
  }, [search.marche]);

  const allStations = useMemo(() => {
    const fromTrips = getStationsFromTrips(trips);
    const fromStationsTable = stations.map((item) => item.name);
    return [...new Set([...fromTrips, ...fromStationsTable])].sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' }),
    );
  }, [stations, trips]);

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
    setSearch({ ...search, departure: favorite.departure, arrival: favorite.arrival });
    setValidationMessage('');
  };

  const swapStations = () => {
    setSearch({ ...search, departure: search.arrival, arrival: search.departure });
    setValidationMessage('');
  };

  const runSearch = async () => {
    if (!search.departure || !search.arrival || search.departure === search.arrival) {
      setValidationMessage('Veuillez choisir deux gares différentes.');
      return;
    }

    const requestedDate = new Date(`${dateText}T${timeText}:00`);
    if (Number.isNaN(requestedDate.getTime())) {
      setValidationMessage('Date/heure invalide. Format attendu: AAAA-MM-JJ et HH:MM.');
      return;
    }

    const transitData = await loadTransitData(search.marche);
    const routeResults = findJourneys({
      trips: transitData.trips,
      fares: transitData.fares,
      departure: search.departure,
      arrival: search.arrival,
      earliestMinute: dateToMinuteOfDay(requestedDate),
      walkingMinutes: search.walkingMinutes,
      lineFilter: search.lineFilter,
      minTransferMinutes: 5,
      maxTransfers: 2,
    });

    setResults(routeResults);
    setSelectedResult(routeResults[0] ?? null);
    setSearch({ ...search, date: requestedDate });
    setValidationMessage(routeResults.length === 0 ? 'Aucun trajet trouvé pour cet horaire.' : '');
    router.push('/(tabs)/resultats');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.today}>{formatDateFr(new Date())}</Text>
        <Text style={styles.source}>
          Source des données: {sourceLabel === 'supabase' ? 'Supabase' : 'CSV local (hors ligne)'}
        </Text>
      </View>

      <Card style={styles.mainCard}>
        <Text style={styles.title}>Planificateur multi-lignes</Text>

        <Text style={styles.label}>Départ</Text>
        <Pressable style={styles.compactPicker} onPress={() => setStationModal('departure')}>
          <Text style={styles.compactPickerText}>{search.departure}</Text>
        </Pressable>

        <Pressable style={styles.swapBtn} onPress={swapStations}>
          <Text style={styles.swapBtnText}>⇅ Inverser départ / arrivée</Text>
        </Pressable>

        <Text style={styles.label}>Arrivée</Text>
        <Pressable style={styles.compactPicker} onPress={() => setStationModal('arrival')}>
          <Text style={styles.compactPickerText}>{search.arrival}</Text>
        </Pressable>

        <Text style={styles.label}>Date & heure</Text>
        <View style={styles.dateTimeRow}>
          <TextInput style={[styles.input, styles.flexOne]} value={dateText} onChangeText={setDateText} placeholder="AAAA-MM-JJ" />
          <TextInput style={[styles.input, styles.flexOne]} value={timeText} onChangeText={setTimeText} placeholder="HH:MM" />
        </View>

        <Text style={styles.label}>Filtre ligne (optionnel)</Text>
        <View style={styles.lineFilterRow}>
          {LINE_OPTIONS.map((option) => {
            const active = search.lineFilter === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.lineFilterChip, active ? styles.lineFilterChipActive : undefined]}
                onPress={() => setSearch({ ...search, lineFilter: option.value })}
              >
                <Text style={[styles.lineFilterText, active ? styles.lineFilterTextActive : undefined]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Marche</Text>
        <View style={styles.lineFilterRow}>
          {MARCHES.map((marche) => {
            const active = search.marche === marche;
            return (
              <Pressable
                key={marche}
                style={[styles.lineFilterChip, active ? styles.lineFilterChipActive : undefined]}
                onPress={() => setSearch({ ...search, marche })}
              >
                <Text style={[styles.lineFilterText, active ? styles.lineFilterTextActive : undefined]}>{marche}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Temps de marche manuel (minutes)</Text>
        <TextInput
          value={String(search.walkingMinutes)}
          onChangeText={(value) => {
            const parsed = Number(value || '0');
            setSearch({ ...search, walkingMinutes: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) });
          }}
          keyboardType="numeric"
          style={styles.input}
        />

        {validationMessage ? <Text style={styles.validation}>{validationMessage}</Text> : null}

        <View style={styles.actionsRow}>
          <Pressable style={styles.outlineBtn} onPress={addCurrentToFavorites}>
            <Text style={styles.outlineText}>Ajouter en favori</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={runSearch}>
            <Text style={styles.primaryText}>Rechercher</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.favTitle}>Favoris</Text>
        {favorites.length === 0 ? (
          <Text style={styles.emptyFav}>Aucun favori enregistré.</Text>
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

      <StationPickerModal
        visible={stationModal === 'departure'}
        title="Choisir la gare de départ"
        stations={allStations}
        selected={search.departure}
        onClose={() => setStationModal(null)}
        onSelect={(station) => setSearch({ ...search, departure: station })}
      />

      <StationPickerModal
        visible={stationModal === 'arrival'}
        title="Choisir la gare d’arrivée"
        stations={allStations}
        selected={search.arrival}
        onClose={() => setStationModal(null)}
        onSelect={(station) => setSearch({ ...search, arrival: station })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16, paddingBottom: 30 },
  headerBlock: { alignItems: 'center', marginBottom: 8 },
  today: { color: SNCFT_COLORS.muted, textTransform: 'capitalize', marginTop: 2, fontWeight: '600' },
  source: { color: '#1e40af', fontWeight: '600', fontSize: 12, marginTop: 2 },
  mainCard: { marginTop: 6 },
  title: { fontSize: 24, fontWeight: '800', color: SNCFT_COLORS.primary, marginBottom: 12 },
  label: { fontSize: 14, color: '#334155', marginTop: 10, fontWeight: '600' },
  compactPicker: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  compactPickerText: { color: '#0f172a', fontWeight: '600' },
  swapBtn: { marginTop: 8, paddingVertical: 6 },
  swapBtnText: { color: SNCFT_COLORS.primary, textAlign: 'center', fontWeight: '700' },
  lineFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  lineFilterChip: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lineFilterChipActive: { backgroundColor: SNCFT_COLORS.primary, borderColor: SNCFT_COLORS.primary },
  lineFilterText: { color: '#1e3a8a', fontSize: 12, fontWeight: '700' },
  lineFilterTextActive: { color: '#fff' },
  dateTimeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flexOne: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: SNCFT_COLORS.primary,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  outlineText: { color: SNCFT_COLORS.primary, textAlign: 'center', fontWeight: '700' },
  primaryBtn: { flex: 1, backgroundColor: SNCFT_COLORS.primary, padding: 12, borderRadius: 12 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  validation: { marginTop: 8, color: '#b91c1c', fontWeight: '600' },
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
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 8, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: { fontWeight: '800', fontSize: 18, color: '#0f172a', marginBottom: 10 },
  modalItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  modalItemActive: { backgroundColor: '#eff6ff', borderRadius: 10 },
  modalItemText: { color: '#1e293b', fontWeight: '600' },
  modalItemTextActive: { color: '#1d4ed8' },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SNCFT_COLORS.primary,
  },
  modalCloseText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
