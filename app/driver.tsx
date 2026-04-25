import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { sendTrainPosition } from '@/lib/live';

export default function DriverModeScreen() {
  const [trainId, setTrainId] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('Mode conducteur désactivé.');
  const [watcher, setWatcher] = useState<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    if (!trainId.trim()) {
      Alert.alert('Train requis', 'Saisissez un numéro de train avant de démarrer le suivi.');
      return;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('GPS refusé', 'Autorisez la position pour activer le suivi live.');
      return;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10_000,
        distanceInterval: 5,
      },
      async (position) => {
        const res = await sendTrainPosition({
          trainId: trainId.trim(),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed,
        });

        setMessage(res.ok ? `Position envoyée (${new Date().toLocaleTimeString('fr-FR')})` : `Erreur: ${res.message}`);
      },
    );

    setWatcher(subscription);
    setRunning(true);
    setMessage('Suivi démarré: envoi toutes les 10 secondes.');
  };

  const stopTracking = () => {
    watcher?.remove();
    setWatcher(null);
    setRunning(false);
    setMessage('Suivi arrêté.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Mode conducteur (prototype)</Text>
        <Text style={styles.info}>Écran caché pour démo interne SNCFT. Précision non officielle.</Text>

        <Text style={styles.label}>Numéro de train</Text>
        <TextInput value={trainId} onChangeText={setTrainId} style={styles.input} placeholder="Ex: 301" />

        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.startBtn]} onPress={startTracking}>
            <Text style={styles.btnText}>Démarrer le suivi</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.stopBtn]} onPress={stopTracking}>
            <Text style={styles.btnText}>Arrêter le suivi</Text>
          </Pressable>
        </View>

        <Text style={[styles.status, running ? styles.running : styles.stopped]}>
          {running ? 'Suivi actif' : 'Suivi inactif'}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4ff' },
  content: { padding: 16 },
  title: { color: '#0b5ed7', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  info: { color: '#475569', marginBottom: 10 },
  label: { color: '#334155', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 6,
    padding: 10,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 10, padding: 12 },
  startBtn: { backgroundColor: '#198754' },
  stopBtn: { backgroundColor: '#b91c1c' },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { marginTop: 12, fontWeight: '700' },
  running: { color: '#166534' },
  stopped: { color: '#b91c1c' },
  message: { marginTop: 4, color: '#334155' },
});
