import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { DIRECTIONS } from '@/lib/constants';
import { loadTripsForMarche } from '@/lib/csv';
import { useSearch } from '@/lib/search-context';
import { TrainTrip } from '@/types';

export default function HorairesScreen() {
  const { search } = useSearch();
  const [trips, setTrips] = useState<TrainTrip[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadTripsForMarche(search.marche)
      .then((nextTrips) => {
        setTrips(nextTrips);
        setLoadError(false);
      })
      .catch(() => {
        setTrips([]);
        setLoadError(true);
      });
  }, [search.marche]);

  const grouped = useMemo(
    () =>
      DIRECTIONS.map((direction) => ({
        direction,
        trips: trips
          .filter((trip) => trip.direction === direction)
          .sort((a, b) => (a.stops[0]?.time ?? '').localeCompare(b.stops[0]?.time ?? '')),
      })),
    [trips],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Horaires complets ({search.marche})</Text>
      {loadError && <Text style={styles.error}>Erreur de lecture des fichiers horaires CSV.</Text>}

      {grouped.map((group) => (
        <Card key={group.direction}>
          <Text style={styles.directionTitle}>{group.direction}</Text>
          {group.trips.length === 0 ? (
            <Text style={styles.empty}>Aucun train disponible pour cette direction.</Text>
          ) : (
            group.trips.map((trip) => (
              <Text key={`${trip.trainNumber}-${trip.direction}`} style={styles.stops}>
                <Text style={styles.train}>Train {trip.trainNumber} </Text>
                {trip.stops.map((s) => `${s.station} ${s.time}`).join(' • ')}
              </Text>
            ))
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7', marginBottom: 8 },
  error: { color: '#b91c1c', marginBottom: 8, fontWeight: '600' },
  directionTitle: { fontSize: 16, fontWeight: '700', color: '#198754', marginBottom: 8 },
  empty: { color: '#64748b' },
  train: { color: '#0f172a', fontWeight: '700' },
  stops: { color: '#334155', lineHeight: 22, marginBottom: 6 },
});
