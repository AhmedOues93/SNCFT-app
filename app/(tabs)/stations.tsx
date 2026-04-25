import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Card } from '@/components/Card';
import { SNCFT_COLORS, STATION_ORDER_BY_DIRECTION } from '@/lib/constants';
import { loadTransitData } from '@/lib/supabase-services';
import { DirectionType, MarcheType, StationInfo } from '@/types';

const directionOptions = Object.keys(STATION_ORDER_BY_DIRECTION) as DirectionType[];

export default function StationsScreen() {
  const [direction, setDirection] = useState<DirectionType>('Tunis → Borj Cedria');
  const [stations, setStations] = useState<StationInfo[]>([]);

  useEffect(() => {
    loadTransitData('Hiver' as MarcheType).then((result) => {
      setStations(result.stations);
    });
  }, []);

  const orderedStops = STATION_ORDER_BY_DIRECTION[direction];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Stations et arrêts</Text>
      <Text style={styles.subtitle}>Affichage dans l&apos;ordre de circulation réel</Text>

      <Card>
        <Text style={styles.label}>Direction</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={direction} onValueChange={(value) => setDirection(value)}>
            {directionOptions.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </Card>

      <Card>
        <Text style={styles.directionTitle}>{direction}</Text>
        {orderedStops.map((station, index) => {
          const extra = stations.find((item) => item.name === station);
          return (
            <View key={station} style={styles.stopRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>
              <View>
                <Text style={styles.name}>{station}</Text>
                {extra ? (
                  <Text style={styles.meta}>Lat {extra.lat.toFixed(3)} · Lon {extra.lon.toFixed(3)}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: SNCFT_COLORS.primary },
  subtitle: { color: '#475569', marginBottom: 8 },
  label: { color: '#334155', fontWeight: '600' },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d4deee',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: 6,
  },
  directionTitle: { fontSize: 16, fontWeight: '800', color: SNCFT_COLORS.secondary, marginBottom: 10 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: { color: SNCFT_COLORS.primary, fontWeight: '700' },
  name: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  meta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
