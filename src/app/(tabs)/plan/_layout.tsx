import { Stack } from 'expo-router';

import { tabStackOptions } from '@/constants/navigation';

export default function Layout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'My Plan' }} />
    </Stack>
  );
}
