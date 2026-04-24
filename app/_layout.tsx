import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SearchProvider } from '@/lib/search-context';

export default function RootLayout() {
  return (
    <SearchProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SearchProvider>
  );
}
