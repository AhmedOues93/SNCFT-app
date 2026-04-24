import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0b5ed7',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#f8fbff' },
        headerTintColor: '#0b5ed7',
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      {[
        ['index', 'Recherche', 'search'],
        ['resultats', 'Résultats', 'train'],
        ['horaires', 'Horaires', 'time'],
        ['stations', 'Stations', 'map'],
        ['apropos', 'À propos', 'information-circle'],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
