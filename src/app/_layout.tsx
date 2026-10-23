import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CatalogProvider } from '@/catalog/live';
import { ThemedText } from '@/components/themed-text';
import { headerBlur } from '@/constants/navigation';
import { db } from '@/db/client';
import { PreferencesProvider, usePreferences } from '@/features/preferences/hooks';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (error) SplashScreen.hideAsync();
  }, [error]);

  if (error) {
    return (
      <View style={styles.error}>
        <ThemedText>Couldn’t open your data: {error.message}</ThemedText>
      </View>
    );
  }
  // Nothing may query the database until its tables exist.
  if (!success) return null;
  return (
    <PreferencesProvider>
      <CatalogProvider>
        <AppNavigator />
      </CatalogProvider>
    </PreferencesProvider>
  );
}

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { prefs, loaded } = usePreferences();
  const onboarded = prefs.onboardedAt !== null;

  // Keep the splash up until we know whether to show onboarding.
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Finishing onboarding (or resetting all data) flips these guards. */}
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="recipe-editor" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scan-recipe" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="cook/[id]"
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen
              name="recipe/[id]"
              options={{
                headerTransparent: true,
                headerTitle: '',
                headerBackButtonDisplayMode: 'minimal',
                ...headerBlur,
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, justifyContent: 'center', padding: 24 },
});
