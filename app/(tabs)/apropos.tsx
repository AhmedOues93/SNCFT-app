import { Image, ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER } from '@/lib/constants';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('@/assets/images/sncft-logo.png')} style={styles.logo} resizeMode="contain" />
      <Card>
        <Text style={styles.title}>SNCFT Banlieue Sud Navigator</Text>
        <Text style={styles.body}>
          Application mobile Expo React Native pour consulter rapidement les horaires statiques de la ligne Banlieue Sud.
        </Text>
        <Text style={styles.body}>Fonctionnalités: recherche, alternatives, marche estimée via GPS, vues horaires et stations.</Text>
        <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
      </Card>
      <Image source={require('@/assets/images/train-secondary.jpg')} style={styles.trainImg} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef6ff' },
  content: { padding: 16 },
  logo: { width: 180, height: 50, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#0b5ed7', marginBottom: 8 },
  body: { color: '#334155', marginBottom: 8, lineHeight: 22 },
  disclaimer: { fontSize: 12, color: '#475569', marginTop: 8 },
  trainImg: { width: '100%', height: 180, borderRadius: 14 },
});
