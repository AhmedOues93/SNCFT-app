import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER, SNCFT_COLORS } from '@/lib/constants';
import { fetchLiveTrainStatus, LiveTrainStatus } from '@/lib/live';
import { useSearch } from '@/lib/search-context';

export default function ResultsScreen() {
  const { results, search, selectedResult, setSelectedResult } = useSearch();
  const [liveStatus, setLiveStatus] = useState<LiveTrainStatus | null>(null);
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);

  useEffect(() => {
    const train = selectedResult?.segments[0]?.trainNumber ?? results[0]?.segments[0]?.trainNumber;
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
            <Text style={styles.liveText}>
              Dernière mise à jour: {new Date(liveStatus.updated_at).toLocaleTimeString('fr-FR')}
            </Text>
            <Text style={styles.liveHint}>Indication expérimentale, non officielle SNCFT.</Text>
          </>
        ) : (
          <Text style={styles.liveText}>Position live non disponible.</Text>
        )}
      </Card>

      {results.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Aucun trajet trouvé pour cette recherche.</Text>
          <Text style={styles.helper}>Astuce: changez l&apos;heure ou laissez « Toutes les lignes ».</Text>
        </Card>
      ) : (
        results.map((result, index) => {
          const isActive = selectedResult?.id === result.id || (!selectedResult && index === 0);
          const expanded = expandedJourneyId === result.id;

          return (
            <Pressable
              key={result.id}
              onPress={() => setSelectedResult(result)}
              style={styles.pressable}
            >
              <Card style={isActive ? styles.activeCard : undefined}>
                <View style={styles.topRow}>
                  <Text style={styles.train}>{result.departureTime} → {result.arrivalTime}</Text>
                  <Text style={styles.badge}>{index === 0 ? 'Prochain' : `Option ${index + 1}`}</Text>
                </View>

                <Text style={styles.total}>Durée totale: {result.totalMinutes} min</Text>
                <Text style={styles.detail}>Correspondances: {result.transferCount}</Text>
                <Text style={styles.detail}>Attente en correspondance: {result.transferWaitingMinutes} min</Text>
                <Text style={styles.detail}>Durée en train: {result.durationMinutes} min</Text>
                <Text style={styles.detail}>Temps de marche: {result.walkingMinutes} min</Text>
                <Text style={styles.detail}>
                  Tarif total: {result.fareAmount ? `${result.fareAmount.toFixed(2)} ${result.fareCurrency ?? 'TND'}` : 'Tarif non disponible'}
                </Text>

                <Text style={styles.segmentHeader}>Segments</Text>
                {result.segments.map((segment, segmentIndex) => {
                  const previousSegment = result.segments[segmentIndex - 1];
                  const transferWait = previousSegment
                    ? Math.max(
                        0,
                        computeWaitMinutes(previousSegment.arrivalTime, segment.departureTime),
                      )
                    : 0;

                  return (
                    <View key={`${result.id}-${segment.lineCode}-${segment.trainNumber}-${segmentIndex}`} style={styles.segmentItem}>
                      {segmentIndex > 0 ? (
                        <Text style={styles.transferText}>
                          Changement à {previousSegment.arrivalStation}: attendre {transferWait} min
                        </Text>
                      ) : null}

                      <Text style={styles.segmentTitle}>
                        Segment {segmentIndex + 1}: Ligne {segment.lineCode} train {segment.trainNumber}
                      </Text>
                      <Text style={styles.segmentText}>
                        {segment.departureStation} ({segment.departureTime}) → {segment.arrivalStation} ({segment.arrivalTime})
                      </Text>
                      <Text style={styles.segmentFare}>
                        Tarif segment: {segment.fareAmount ? `${segment.fareAmount.toFixed(2)} ${segment.fareCurrency ?? 'TND'}` : 'Tarif non disponible'}
                      </Text>
                    </View>
                  );
                })}

                <Pressable
                  style={styles.expandBtn}
                  onPress={() => setExpandedJourneyId(expanded ? null : result.id)}
                >
                  <Text style={styles.expandText}>{expanded ? 'Masquer les arrêts intermédiaires' : 'Afficher les arrêts intermédiaires'}</Text>
                </Pressable>

                {expanded ? (
                  <View style={styles.stopsWrap}>
                    {result.segments.map((segment, segmentIndex) => (
                      <View key={`${result.id}-stops-${segmentIndex}`} style={styles.segmentStopsWrap}>
                        <Text style={styles.segmentStopsTitle}>Ligne {segment.lineCode} • train {segment.trainNumber}</Text>
                        {segment.intermediateStops.length === 0 ? (
                          <Text style={styles.stopItem}>Aucun arrêt intermédiaire.</Text>
                        ) : (
                          segment.intermediateStops.map((stop) => (
                            <Text key={`${result.id}-${segment.trainNumber}-${stop}`} style={styles.stopItem}>
                              • {stop}
                            </Text>
                          ))
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      )}

      <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const parseTime = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const computeWaitMinutes = (arrival: string, departure: string): number => {
  const diff = parseTime(departure) - parseTime(arrival);
  return diff >= 0 ? diff : diff + 24 * 60;
};

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
  total: { marginTop: 8, color: '#0f172a', fontWeight: '800' },
  detail: { marginTop: 5, color: '#166534', fontWeight: '600' },
  segmentHeader: { marginTop: 10, fontWeight: '800', color: '#1f2937' },
  segmentItem: { marginTop: 8, backgroundColor: '#f8fbff', borderRadius: 10, padding: 8 },
  segmentTitle: { color: '#1d4ed8', fontWeight: '700' },
  segmentText: { color: '#334155', marginTop: 3 },
  segmentFare: { color: '#166534', marginTop: 3, fontWeight: '600' },
  transferText: { color: '#92400e', fontWeight: '700', marginBottom: 4 },
  expandBtn: { marginTop: 10, paddingVertical: 6 },
  expandText: { textAlign: 'center', color: SNCFT_COLORS.primary, fontWeight: '700' },
  stopsWrap: { marginTop: 4, backgroundColor: '#f8fbff', borderRadius: 10, padding: 8 },
  segmentStopsWrap: { marginBottom: 8 },
  segmentStopsTitle: { fontWeight: '700', color: '#1f2937' },
  stopItem: { color: '#475569', marginTop: 4 },
  disclaimer: { color: '#475569', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
