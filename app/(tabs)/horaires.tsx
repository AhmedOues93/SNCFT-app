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

  useEffect(() => {
    loadTripsForMarche(search.marche).then(setTrips);
  }, [search.marche]);

  const grouped = useMemo(
    () =>
      DIRECTIONS.map((direction) => ({
        direction,
        trips: trips.filter((trip) => trip.direction === direction),
      })),
    [trips],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Horaires complets ({search.marche})</Text>
      {grouped.map((group) => (
        <Card key={group.direction}>
          <Text style={styles.directionTitle}>{group.direction}</Text>
          {group.trips.length === 0 ? (
            <Text style={styles.empty}>Aucun train dans ce sens.</Text>
          ) : (
            group.trips.map((trip) => (
              <Text key={`${trip.trainNumber}-${trip.direction}`} style={styles.stops}>
                <Text style={styles.train}>#{trip.trainNumber} </Text>
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
  directionTitle: { fontSize: 16, fontWeight: '700', color: '#198754', marginBottom: 8 },
  empty: { color: '#64748b' },
  train: { color: '#0f172a', fontWeight: '700' },
  stops: { color: '#334155', lineHeight: 22, marginBottom: 6 },
});
