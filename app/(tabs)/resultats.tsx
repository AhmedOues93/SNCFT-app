import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER } from '@/lib/constants';
import { useSearch } from '@/lib/search-context';

export default function ResultsScreen() {
  const { results, search } = useSearch();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Prochains trains ({search.marche})</Text>
      <Text style={styles.subtitle}>
        {search.departure} → {search.arrival}
      </Text>
      <Text style={styles.context}>Temps de marche inclus: {search.walkingMinutes} min</Text>

      {results.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Aucun train trouvé pour cette recherche.</Text>
          <Text style={styles.helper}>Essayez une heure plus tôt ou réduisez le temps de marche.</Text>
        </Card>
      ) : (
        results.map((result, index) => (
          <Card key={`${result.trainNumber}-${index}`}>
            <View style={styles.topRow}>
              <Text style={styles.train}>Train {result.trainNumber}</Text>
              <Text style={styles.badge}>{index === 0 ? 'Le plus proche' : `Alternative ${index}`}</Text>
            </View>
            <Text style={styles.direction}>{result.direction}</Text>
            <View style={styles.row}>
              <Text style={styles.bigTime}>{result.departureTime}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.bigTime}>{result.arrivalTime}</Text>
            </View>
            <Text style={styles.duration}>Durée estimée: {result.durationMinutes} min</Text>
          </Card>
        ))
      )}

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7' },
  subtitle: { color: '#334155' },
  context: { marginBottom: 14, color: '#166534', fontWeight: '600' },
  empty: { color: '#334155', fontWeight: '600' },
  helper: { marginTop: 8, color: '#64748b' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  train: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  direction: { fontSize: 13, color: '#475569', marginBottom: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigTime: { fontSize: 34, fontWeight: '800', color: '#0b5ed7' },
  arrow: { fontSize: 24, color: '#198754', paddingHorizontal: 10 },
  duration: { marginTop: 8, fontSize: 14, color: '#166534', fontWeight: '600' },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
