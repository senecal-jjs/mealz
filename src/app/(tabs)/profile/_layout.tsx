import { Stack } from 'expo-router';

import { tabStackOptions } from '@/constants/navigation';

export default function Layout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="diet" options={{ title: 'Diet', headerLargeTitleEnabled: false }} />
      <Stack.Screen
        name="allergies"
        options={{ title: 'Allergies', headerLargeTitleEnabled: false }}
      />
      <Stack.Screen
        name="dislikes"
        options={{ title: 'Dislikes', headerLargeTitleEnabled: false }}
      />
    </Stack>
  );
}
