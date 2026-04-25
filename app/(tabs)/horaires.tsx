import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Card } from '@/components/Card';
import { MARCHES, SNCFT_COLORS, STATIONS } from '@/lib/constants';
import { loadTransitData } from '@/lib/supabase-services';
import { useSearch } from '@/lib/search-context';
import { DirectionType, MarcheType, TrainTrip } from '@/types';

const TOUS = 'Toutes';

export default function HorairesScreen() {
  const { search } = useSearch();
  const [trips, setTrips] = useState<TrainTrip[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [source, setSource] = useState<'supabase' | 'csv'>('csv');
  const [stations, setStations] = useState(STATIONS);
  const [marcheFilter, setMarcheFilter] = useState<MarcheType>(search.marche);
  const [directionFilter, setDirectionFilter] = useState<DirectionType | typeof TOUS>(TOUS);
  const [stationFilter, setStationFilter] = useState<string>(TOUS);

  useEffect(() => {
    loadTransitData(marcheFilter)
      .then((result) => {
        setTrips(result.trips);
        setStations(result.stations.length > 0 ? result.stations : STATIONS);
        setSource(result.source);
        setLoadError(false);
      })
      .catch(() => {
        setTrips([]);
        setLoadError(true);
      });
  }, [marcheFilter]);

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const directionOk = directionFilter === TOUS || trip.direction === directionFilter;
        const stationOk =
          stationFilter === TOUS || trip.stops.some((stop) => stop.station.toLowerCase() === stationFilter.toLowerCase());
        return directionOk && stationOk;
      }),
    [directionFilter, stationFilter, trips],
  );

  const directions = useMemo(
    () => [...new Set(trips.map((trip) => trip.direction))].sort((a, b) => a.localeCompare(b, 'fr')),
    [trips],
  );

  const grouped = useMemo(
    () =>
      directions.map((direction) => ({
        direction,
        trips: filteredTrips
          .filter((trip) => trip.direction === direction)
          .sort((a, b) => (a.stops[0]?.time ?? '').localeCompare(b.stops[0]?.time ?? '')),
      })),
    [directions, filteredTrips],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Horaires SNCFT Banlieue Sud</Text>
      <Text style={styles.subtitle}>Source: {source === 'supabase' ? 'Supabase' : 'CSV local (secours)'}</Text>

      <Card>
        <Text style={styles.filterTitle}>Filtres</Text>
        <Text style={styles.label}>Marche</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={marcheFilter} onValueChange={(value) => setMarcheFilter(value)}>
            {MARCHES.map((marche) => (
              <Picker.Item key={marche} label={marche} value={marche} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Direction</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={directionFilter} onValueChange={(value) => setDirectionFilter(value)}>
            <Picker.Item label="Toutes" value={TOUS} />
            {directions.map((direction) => (
              <Picker.Item key={direction} label={direction} value={direction} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Station</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={stationFilter} onValueChange={(value) => setStationFilter(value)}>
            <Picker.Item label="Toutes" value={TOUS} />
            {stations.map((station) => (
              <Picker.Item key={station.name} label={station.name} value={station.name} />
            ))}
          </Picker>
        </View>
      </Card>

      {loadError && <Text style={styles.error}>Erreur de lecture des horaires (Supabase et CSV).</Text>}

      {grouped.map((group) => (
        <Card key={group.direction}>
          <Text style={styles.directionTitle}>{group.direction}</Text>
          {group.trips.length === 0 ? (
            <Text style={styles.empty}>Aucun train disponible pour cette direction avec ces filtres.</Text>
          ) : (
            group.trips.map((trip) => (
              <View key={`${trip.trainNumber}-${trip.direction}`} style={styles.tripBlock}>
                <Text style={styles.train}>Train {trip.trainNumber}</Text>
                {trip.stops.map((s) => (
                  <Text key={`${trip.trainNumber}-${s.station}-${s.time}`} style={styles.stopLine}>
                    {s.time} · {s.station}
                  </Text>
                ))}
              </View>
            ))
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: SNCFT_COLORS.primary },
  subtitle: { color: '#475569', marginBottom: 8 },
  filterTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  label: { marginTop: 8, color: '#334155', fontWeight: '600' },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 5,
    backgroundColor: '#fff',
  },
  error: { color: '#b91c1c', marginBottom: 8, fontWeight: '600' },
  directionTitle: { fontSize: 16, fontWeight: '800', color: SNCFT_COLORS.secondary, marginBottom: 8 },
  empty: { color: '#64748b' },
  tripBlock: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fbfdff',
  },
  train: { color: '#0f172a', fontWeight: '800', marginBottom: 4 },
  stopLine: { color: '#334155', lineHeight: 20 },
});
