import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CreditPacks } from '@/components/credit-packs';
import { HeaderTextButton } from '@/components/header-text-button';
import { RecoveryCode } from '@/components/recovery-code';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCents, type CreditSummary } from '@/features/credit/credit';
import { refreshCredit } from '@/features/credit/refresh';
import { useCredit } from '@/features/credit/store';
import { isCloudScanConfigured } from '@/features/my-recipes/cloud';
import { isTextRecognitionAvailable } from '@/features/my-recipes/scan';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

/** Asks once before the first scan: photos leave the phone to be read by Claude. */
function askToScan(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      'Recipes are read by computer vision',
      'Mealz sends the photos of each recipe you scan to its server, where a computer vision model reads them. Photos and recipes aren’t stored.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ),
  );
}

/** "3 free scans left this month. After that, each scan costs $0.10." */
function allowanceLine(s: CreditSummary): string {
  if (s.priceCents === 0) return 'Scanning is free right now.';
  if (s.freeScansLeft === 0)
    return `No free scans left this month. Each scan costs ${formatCents(s.priceCents)}.`;
  const free = s.freeScansLeft === 1 ? '1 free scan' : `${s.freeScansLeft} free scans`;
  return `${free} left this month. After that, each scan costs ${formatCents(s.priceCents)}.`;
}

/**
 * Where adding a recipe starts: scan one (read by Claude, paid from scan
 * credit after the free scans) or type it in. Shows the credit, sells packs,
 * and holds the recovery code that moves credit to another phone.
 */
export default function AddRecipeScreen() {
  const theme = useTheme();
  const { prefs } = usePreferences();
  const summary = useCredit((s) => s.summary);
  const [offline, setOffline] = useState(false);
  const canScan = isCloudScanConfigured() && isTextRecognitionAvailable();
  // Development only: Expo Go lacks the text recognition module, and a Metro
  // started without EXPO_PUBLIC_SCAN_SERVER_URL (see .env) leaves no server address.
  const unavailable = !isTextRecognitionAvailable()
    ? 'Scanning needs Mealz’s own build; it isn’t available here (for example in Expo Go). You can still type a recipe in.'
    : 'Scanning isn’t set up in this build: it has no scan server address. You can still type a recipe in.';

  const refresh = () =>
    refreshCredit(prefs).then(
      () => setOffline(false),
      () => setOffline(true),
    );

  useEffect(() => {
    if (canScan) void refresh();
    // Asked once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = async () => {
    if (prefs.cloudScan !== 'allowed') {
      if (!(await askToScan())) return;
      await preferenceActions.save({ cloudScan: 'allowed' });
    }
    router.push('/add-recipe/scan');
  };

  const pricing = !!summary && summary.priceCents > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderTextButton label="Cancel" onPress={() => router.back()} />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          {canScan ? (
            <Button icon="doc.text.viewfinder" label="Scan a Recipe" onPress={() => void scan()} />
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {unavailable}
            </ThemedText>
          )}
          <Button
            variant="secondary"
            icon="square.and.pencil"
            label="Type It In"
            onPress={() => router.replace('/recipe-editor')}
          />
          {canScan && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Scanning reads a cookbook page, recipe card or screenshot with computer vision. You
              review the recipe before it’s saved.
            </ThemedText>
          )}
        </View>

        {canScan && (
          <View style={styles.credit}>
            {summary ? (
              <>
                {pricing && (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      SCAN CREDIT
                    </ThemedText>
                    <ThemedText type="title" style={styles.amount}>
                      {formatCents(summary.balanceCents)}
                    </ThemedText>
                  </>
                )}
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  {allowanceLine(summary)}
                </ThemedText>
              </>
            ) : offline ? (
              <>
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  Couldn’t reach Mealz to check your scan credit.
                </ThemedText>
                <Button variant="secondary" label="Try Again" onPress={() => void refresh()} />
              </>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        )}

        {canScan && pricing && <CreditPacks priceCents={summary.priceCents} />}
        {canScan && (pricing || (summary?.balanceCents ?? 0) !== 0) && (
          <RecoveryCode onChange={() => void refresh()} />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  credit: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 80,
    justifyContent: 'center',
  },
  amount: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
