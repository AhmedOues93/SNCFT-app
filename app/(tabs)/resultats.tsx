import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER, SNCFT_COLORS } from '@/lib/constants';
import { fetchLiveTrainStatus, LiveTrainStatus } from '@/lib/live';
import { useSearch } from '@/lib/search-context';

export default function ResultsScreen() {
  const { results, search, selectedResult, setSelectedResult } = useSearch();
  const [liveStatus, setLiveStatus] = useState<LiveTrainStatus | null>(null);

  useEffect(() => {
    const train = selectedResult?.trainNumber ?? results[0]?.trainNumber;
    if (!train) {
      setLiveStatus(null);
      return;
    }

    fetchLiveTrainStatus(train).then(setLiveStatus);
  }, [results, selectedResult]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('@/assets/images/train-secondary.jpg')} style={styles.hero} resizeMode="cover" />

      <Text style={styles.title}>Résultats de trajet</Text>
      <Text style={styles.subtitle}>
        {search.departure} → {search.arrival} • {search.marche}
      </Text>

      <Card>
        <Text style={styles.liveTitle}>Suivi live (prototype)</Text>
        {liveStatus ? (
          <>
            <Text style={styles.liveText}>Statut: {liveStatus.status ?? 'Non défini'}</Text>
            <Text style={styles.liveText}>Prochaine station estimée: {liveStatus.next_station ?? 'Inconnue'}</Text>
            <Text style={styles.liveText}>
              Retard estimé: {liveStatus.delay_minutes !== null ? `${liveStatus.delay_minutes} min` : 'Non disponible'}
            </Text>
            <Text style={styles.liveText}>Dernière mise à jour: {new Date(liveStatus.updated_at).toLocaleTimeString('fr-FR')}</Text>
            <Text style={styles.liveHint}>Indication expérimentale, non officielle SNCFT.</Text>
          </>
        ) : (
          <Text style={styles.liveText}>Position live non disponible.</Text>
        )}
      </Card>

      {results.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Aucun train trouvé pour cette recherche.</Text>
          <Text style={styles.helper}>Astuce: vérifiez le sens choisi, la marche ou l&apos;heure demandée.</Text>
        </Card>
      ) : (
        results.map((result, index) => {
          const isActive =
            (selectedResult?.trainNumber === result.trainNumber &&
              selectedResult?.departureTime === result.departureTime) ||
            (!selectedResult && index === 0);
          const totalMinutes = result.durationMinutes + result.waitingMinutes + result.walkingMinutes;

          return (
            <Pressable
              key={`${result.trainNumber}-${result.departureTime}`}
              onPress={() => setSelectedResult(result)}
              style={styles.pressable}
            >
              <Card style={isActive ? styles.activeCard : undefined}>
                <View style={styles.topRow}>
                  <Text style={styles.train}>Train {result.trainNumber}</Text>
                  <Text style={styles.badge}>{index === 0 ? 'Prochain' : `Alternative ${index}`}</Text>
                </View>
                <Text style={styles.direction}>{result.direction}</Text>

                <View style={styles.timeline}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <View style={styles.dot} />
                </View>

                <View style={styles.rowTimes}>
                  <Text style={styles.bigTime}>{result.departureTime}</Text>
                  <Text style={styles.bigTime}>{result.arrivalTime}</Text>
                </View>

                <Text style={styles.detail}>Départ: {result.departureStation}</Text>
                <Text style={styles.detail}>Arrivée: {result.arrivalStation}</Text>
                <Text style={styles.detail}>Temps de marche: {result.walkingMinutes} min</Text>
                <Text style={styles.detail}>Temps d'attente: {result.waitingMinutes} min</Text>
                <Text style={styles.detail}>Durée train: {result.durationMinutes} min</Text>
                <Text style={styles.total}>Durée totale estimée: {totalMinutes} min</Text>
                <Text style={styles.detail}>
                  Tarif: {result.fareAmount ? `${result.fareAmount.toFixed(2)} ${result.fareCurrency ?? 'TND'}` : 'Non disponible'}
                </Text>

                <Text style={styles.stopsTitle}>Arrêts intermédiaires</Text>
                {result.intermediateStops.length === 0 ? (
                  <Text style={styles.stopItem}>Aucun arrêt intermédiaire.</Text>
                ) : (
                  <View style={styles.stopsWrap}>
                    {result.intermediateStops.map((stop) => (
                      <Text key={`${result.trainNumber}-${stop}`} style={styles.stopItem}>
                        • {stop}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })
      )}

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16 },
  hero: { width: '100%', height: 140, borderRadius: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: SNCFT_COLORS.primary },
  subtitle: { color: '#334155', marginBottom: 12, fontWeight: '600' },
  liveTitle: { color: '#0b5ed7', fontWeight: '800', marginBottom: 6 },
  liveText: { color: '#334155', marginBottom: 4 },
  liveHint: { color: '#64748b', fontSize: 12, marginTop: 4 },
  empty: { color: '#334155', fontWeight: '600' },
  helper: { marginTop: 8, color: '#64748b' },
  pressable: { marginBottom: 10 },
  activeCard: { borderColor: SNCFT_COLORS.primary, borderWidth: 1.5 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  train: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  direction: { fontSize: 13, color: '#475569', marginBottom: 10, marginTop: 6 },
  timeline: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: SNCFT_COLORS.primary },
  line: { flex: 1, height: 3, backgroundColor: '#bfdbfe' },
  rowTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  bigTime: { fontSize: 32, fontWeight: '800', color: SNCFT_COLORS.primary },
  detail: { marginTop: 5, color: '#166534', fontWeight: '600' },
  total: { marginTop: 7, color: '#0f172a', fontWeight: '800' },
  stopsTitle: { marginTop: 10, fontWeight: '700', color: '#1f2937' },
  stopsWrap: { marginTop: 4, backgroundColor: '#f8fbff', borderRadius: 10, padding: 8 },
  stopItem: { color: '#475569', marginTop: 4 },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
