import { Image, ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { APP_DISCLAIMER, SNCFT_COLORS } from '@/lib/constants';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('@/assets/images/train-secondary.jpg')} style={styles.hero} resizeMode="cover" />
      <Image source={require('@/assets/images/sncft-logo.png')} style={styles.logo} resizeMode="contain" />

      <Card>
        <Text style={styles.title}>SNCFT Banlieue Sud Navigator</Text>
        <Text style={styles.body}>
          Application mobile Expo React Native pour planifier les trajets Banlieue Sud avec des horaires publiés.
        </Text>
        <Text style={styles.body}>
          Source principale: Supabase. En cas d&apos;indisponibilité, l&apos;application bascule automatiquement sur le CSV local.
        </Text>
        <Text style={styles.disclaimer}>{APP_DISCLAIMER}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SNCFT_COLORS.background },
  content: { padding: 16 },
  hero: { width: '100%', height: 220, borderRadius: 16, marginBottom: 10 },
  logo: { width: 190, height: 54, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: SNCFT_COLORS.primary, marginBottom: 8 },
  body: { color: '#334155', marginBottom: 8, lineHeight: 22 },
  disclaimer: { fontSize: 12, color: '#475569', marginTop: 8 },
});
