import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parsedToDraft } from '@/domain/recipe-text';
import { createAppAttest } from '@/features/my-recipes/app-attest';
import {
  isCloudScanConfigured,
  newInstallId,
  readWithCloud,
  SCAN_SERVER_URL,
  type ScannedPage,
} from '@/features/my-recipes/cloud';
import { usePendingDraft } from '@/features/my-recipes/draft-store';
import { pickPhoto, type PhotoSource } from '@/features/my-recipes/pick-photo';
import { isTextRecognitionAvailable, readPage } from '@/features/my-recipes/scan';
import { structureScan, type CloudReader } from '@/features/my-recipes/structure';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import type { Preferences } from '@/features/preferences/preferences';
import { useTheme } from '@/hooks/use-theme';

import { getModelAvailability, type ModelAvailability } from '../../modules/recipe-model';

/** A line about how the recipe will be organized, or null when there's nothing worth saying. */
function modelNote(availability: ModelAvailability): string | null {
  switch (availability) {
    case 'available':
      return 'Apple Intelligence will organize the recipe, on your iPhone.';
    case 'appleIntelligenceNotEnabled':
      return 'Turn on Apple Intelligence in Settings for better results with tricky layouts.';
    case 'modelNotReady':
      return 'Apple Intelligence is still downloading, so the recipe is organized with simpler rules for now.';
    default:
      return null;
  }
}

/** Where the photos go, in one line. */
function privacyNote(prefs: Preferences): string {
  if (!isCloudScanConfigured() || prefs.cloudScan === 'declined') {
    return 'The text is read on your iPhone. Photos are never uploaded.';
  }
  return prefs.cloudScan === 'allowed'
    ? 'Photos are read on the Mealz server and aren’t stored.'
    : 'You’ll be asked before any photo leaves your iPhone.';
}

/** Asks once whether scans may be read on the Mealz server. Resolves with the answer. */
function askCloudConsent(): Promise<'allowed' | 'declined'> {
  return new Promise((resolve) =>
    Alert.alert(
      'Read recipes with the Mealz server?',
      'For the best results, Mealz can send the photos of this recipe to its server, where a computer vision algorithm reads them. Photos and recipes aren’t stored. You can change this in Profile.',
      [
        { text: 'Keep on My Phone', style: 'cancel', onPress: () => resolve('declined') },
        { text: 'Allow', onPress: () => resolve('allowed') },
      ],
      { cancelable: false },
    ),
  );
}

/** The cloud reader to use, asking for consent the first time. Null keeps the scan on the phone. */
async function cloudReaderFor(prefs: Preferences): Promise<CloudReader> {
  if (!SCAN_SERVER_URL) return null;
  let { cloudScan, installId } = prefs;
  if (!cloudScan) {
    cloudScan = await askCloudConsent();
    installId ??= newInstallId();
    await preferenceActions.save({ cloudScan, installId });
  }
  if (cloudScan !== 'allowed') return null;
  const id = installId ?? newInstallId();
  if (!installId) await preferenceActions.save({ installId: id });

  let attestKeyId = prefs.attestKeyId;
  const attest = createAppAttest(
    SCAN_SERVER_URL,
    {
      get: () => attestKeyId,
      set: async (keyId) => {
        attestKeyId = keyId;
        await preferenceActions.save({ attestKeyId: keyId });
      },
    },
    { log: __DEV__ ? console.log : undefined },
  );
  return (pages) => readWithCloud(pages, id, { attest });
}

/**
 * Photograph a recipe (one or more pages), read its text on the device, and
 * open the result in the editor for review. With the user's permission the
 * photos are read by Claude on the Mealz server; otherwise, or when that
 * fails, everything happens on the phone.
 */
export default function ScanRecipeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const { defaultServings } = prefs;
  const cloudAllowed = isCloudScanConfigured() && prefs.cloudScan === 'allowed';
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [reading, setReading] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [availability] = useState(getModelAvailability);
  const note = cloudAllowed ? null : modelNote(availability);

  const addPage = async (source: PhotoSource) => {
    const uri = await pickPhoto(source);
    if (!uri) return;
    setReading(true);
    try {
      const lines = await readPage(uri);
      if (lines.length === 0) {
        Alert.alert(
          'No text found',
          'Try again in good light, with the whole recipe in frame and the page flat.',
        );
      } else {
        setPages((p) => [...p, { uri, lines }]);
      }
    } catch (e) {
      Alert.alert('Couldn’t read the photo', String(e));
    } finally {
      setReading(false);
    }
  };

  const review = async () => {
    const cloud = await cloudReaderFor(prefs);
    setOrganizing(true);
    const { recipe, source, notes } = await structureScan(pages, cloud);
    if (__DEV__)
      console.log(`[scan] organized with: ${source} (model availability: ${availability})`);
    usePendingDraft.getState().set(parsedToDraft(recipe, defaultServings), notes);
    router.replace({ pathname: '/recipe-editor', params: { source: 'scan', reader: source } });
  };

  const lineCount = pages.reduce((n, p) => n + p.lines.length, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scan a Recipe',
          headerLeft: () => (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
              <ThemedText style={{ color: theme.tint }}>Cancel</ThemedText>
            </Pressable>
          ),
        }}
      />
      <View
        style={[
          styles.screen,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.hero}>
          <SymbolView
            name={pages.length ? 'doc.text.viewfinder' : 'text.viewfinder'}
            size={64}
            tintColor={theme.tint}
          />
          {reading || organizing ? (
            <>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">
                {!organizing
                  ? 'Reading the recipe…'
                  : cloudAllowed
                    ? 'Mealz is reading the recipe…'
                    : 'Organizing the recipe…'}
              </ThemedText>
            </>
          ) : pages.length ? (
            <>
              <ThemedText type="subtitle" style={styles.title}>
                {pages.length === 1 ? '1 page read' : `${pages.length} pages read`}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Found {lineCount} lines of text. Add another page if the recipe continues, or review
                what Mealz found.
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.title}>
                Snap a recipe
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Photograph a cookbook page, recipe card or screenshot. Hold the page flat and fit
                the whole recipe in the frame.
              </ThemedText>
            </>
          )}
        </View>

        <View style={styles.privacy}>
          <SymbolView name="lock.fill" size={14} tintColor={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.privacyText}>
            {privacyNote(prefs)}
          </ThemedText>
        </View>

        {note && isTextRecognitionAvailable() && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {note}
          </ThemedText>
        )}

        {!isTextRecognitionAvailable() && (
          <ThemedText type="small" style={styles.warning}>
            Scanning isn’t available in this build. You can still type a recipe in.
          </ThemedText>
        )}

        <View style={styles.actions}>
          {pages.length > 0 && !reading && !organizing && (
            <Button icon="checkmark" label="Review Recipe" onPress={review} />
          )}
          <Button
            variant={pages.length ? 'secondary' : 'primary'}
            icon="camera"
            label={pages.length ? 'Photograph Another Page' : 'Take Photo'}
            onPress={() => addPage('camera')}
          />
          <Button
            variant="secondary"
            icon="photo"
            label={pages.length ? 'Add Page from Library' : 'Choose from Library'}
            onPress={() => addPage('library')}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.five },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 28, lineHeight: 34, textAlign: 'center' },
  center: { textAlign: 'center' },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  privacyText: { textAlign: 'center' },
  note: { textAlign: 'center', marginBottom: Spacing.three },
  warning: { color: '#E5484D', textAlign: 'center', marginBottom: Spacing.three },
  actions: { gap: Spacing.two },
});
