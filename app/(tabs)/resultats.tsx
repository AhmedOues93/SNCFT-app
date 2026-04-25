import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER } from '@/lib/constants';
import { useSearch } from '@/lib/search-context';

export default function ResultsScreen() {
  const { results, search, selectedResult, setSelectedResult } = useSearch();
  const activeResult = selectedResult ?? results[0] ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Résultat de recherche ({search.marche})</Text>
      <Text style={styles.subtitle}>
        {search.departure} → {search.arrival}
      </Text>

      {!activeResult ? (
        <Card>
          <Text style={styles.empty}>Aucun train trouvé pour cette recherche.</Text>
          <Text style={styles.helper}>Essayez une heure plus tôt ou réduisez le temps de marche.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <View style={styles.topRow}>
              <Text style={styles.train}>Train {activeResult.trainNumber}</Text>
              <Text style={styles.badge}>Trajet sélectionné</Text>
            </View>
            <Text style={styles.direction}>{activeResult.direction}</Text>
            <View style={styles.row}>
              <Text style={styles.bigTime}>{activeResult.departureTime}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.bigTime}>{activeResult.arrivalTime}</Text>
            </View>
            <Text style={styles.detail}>Départ: {activeResult.departureStation}</Text>
            <Text style={styles.detail}>Arrivée: {activeResult.arrivalStation}</Text>
            <Text style={styles.detail}>Durée du trajet: {activeResult.durationMinutes} min</Text>
            <Text style={styles.detail}>Temps de marche: {activeResult.walkingMinutes} min</Text>
            <Text style={styles.detail}>Temps d'attente estimé: {activeResult.waitingMinutes} min</Text>
          </Card>

          {results.length > 1 && (
            <Card>
              <Text style={styles.altTitle}>Alternatives disponibles</Text>
              {results.slice(1).map((result, index) => (
                <Pressable
                  key={`${result.trainNumber}-${result.departureTime}`}
                  style={styles.altItem}
                  onPress={() => setSelectedResult(result)}
                >
                  <Text style={styles.altTrain}>Alternative {index + 1}: Train {result.trainNumber}</Text>
                  <Text style={styles.altText}>
                    {result.departureTime} → {result.arrivalTime} • durée {result.durationMinutes} min
                  </Text>
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7' },
  subtitle: { color: '#334155', marginBottom: 12 },
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
  detail: { marginTop: 6, color: '#166534', fontWeight: '600' },
  altTitle: { fontSize: 16, color: '#0f172a', fontWeight: '700', marginBottom: 10 },
  altItem: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f8fbff',
  },
  altTrain: { fontWeight: '700', color: '#0f172a' },
  altText: { color: '#475569', marginTop: 2 },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
