import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { STATIONS } from '@/lib/constants';

export default function StationsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Stations Banlieue Sud</Text>
      {STATIONS.map((station) => (
        <Card key={station.name}>
          <Text style={styles.name}>{station.name}</Text>
          <Text style={styles.meta}>Lignes: {station.lines.join(', ')}</Text>
          <Text style={styles.meta}>
            Coordonnées: {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#475569', marginTop: 4 },
});
