import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CreditPacks } from '@/components/credit-packs';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parsedToDraft } from '@/domain/recipe-text';
import { canAffordScan, scanCostNote } from '@/features/credit/credit';
import { useCredit } from '@/features/credit/store';
import {
  CloudScanError,
  type CloudScanFailure,
  type ScannedPage,
} from '@/features/my-recipes/cloud';
import { usePendingDraft } from '@/features/my-recipes/draft-store';
import { pickPhoto, type PhotoSource } from '@/features/my-recipes/pick-photo';
import { readScan } from '@/features/my-recipes/read-scan';
import { readPage } from '@/features/my-recipes/scan';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

/** What to tell the user when the server couldn't read the scan. */
const FAILURE_MESSAGES: Record<CloudScanFailure, string> = {
  offline: 'You’re offline. Connect to the internet and try again.',
  timeout: 'Reading the recipe took too long. Try again.',
  unreadable:
    'Mealz couldn’t find a recipe in these photos. Try again with the whole recipe in frame, in good light. You weren’t charged.',
  limit: 'You’ve reached today’s scan limit. Try again tomorrow.',
  disabled: 'Scanning is paused right now. Try again later, or type the recipe in.',
  attestation:
    'This copy of Mealz couldn’t be verified. Scanning works in Mealz from the App Store, on an iPhone.',
  no_credit: 'You’re out of scan credit. Add credit to have this recipe read.',
  server: 'Something went wrong reading the recipe. Try again.',
};

/**
 * Photograph a recipe (one or more pages) and have Claude read it on the scan
 * server, then review it in the editor. The phone recognizes each page's text
 * first: pages with none aren't sent, and the text goes along with the photos.
 */
export default function ScanRecipeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const credit = useCredit((s) => s.summary);
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [reading, setReading] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [failure, setFailure] = useState<CloudScanFailure | null>(null);

  // Out of credit: the packs show here, and once credit arrives the scan can go ahead.
  const outOfCredit = !!credit && !canAffordScan(credit);
  const shownFailure = failure === 'no_credit' && !outOfCredit ? null : failure;
  const costNote = credit && !outOfCredit ? scanCostNote(credit) : null;

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
        setFailure(null);
      }
    } catch (e) {
      Alert.alert('Couldn’t read the photo', String(e));
    } finally {
      setReading(false);
    }
  };

  const review = async () => {
    if (outOfCredit) {
      setFailure('no_credit');
      return;
    }
    setFailure(null);
    setOrganizing(true);
    try {
      const { recipe, notes } = await readScan(pages, prefs);
      usePendingDraft.getState().set(parsedToDraft(recipe, prefs.defaultServings), notes);
      router.replace({ pathname: '/recipe-editor', params: { source: 'scan' } });
    } catch (e) {
      if (__DEV__) console.log(`[scan] server couldn’t read the scan: ${String(e)}`);
      setFailure(e instanceof CloudScanError ? e.reason : 'server');
      setOrganizing(false);
    }
  };

  const lineCount = pages.reduce((n, p) => n + p.lines.length, 0);
  const busy = reading || organizing;

  return (
    <ScrollView
      // The header isn't translucent, so only the bottom safe area needs room.
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.hero}>
        <SymbolView
          name={pages.length ? 'doc.text.viewfinder' : 'text.viewfinder'}
          size={64}
          tintColor={theme.tint}
        />
        {busy ? (
          <>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">
              {organizing ? 'Mealz is reading the recipe…' : 'Reading the page…'}
            </ThemedText>
          </>
        ) : pages.length ? (
          <>
            <ThemedText type="subtitle" style={styles.title}>
              {pages.length === 1 ? '1 page ready' : `${pages.length} pages ready`}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Found {lineCount} lines of text. Add another page if the recipe continues.
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="subtitle" style={styles.title}>
              Snap a recipe
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Photograph a cookbook page, recipe card or screenshot. Hold the page flat and fit the
              whole recipe in the frame.
            </ThemedText>
          </>
        )}
      </View>

      {shownFailure && !busy && (
        <View style={[styles.failure, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="exclamationmark.triangle" size={18} tintColor={theme.textSecondary} />
          <ThemedText style={styles.failureText}>{FAILURE_MESSAGES[shownFailure]}</ThemedText>
        </View>
      )}
      {shownFailure === 'no_credit' && credit && <CreditPacks priceCents={credit.priceCents} />}

      <View style={styles.privacy}>
        <SymbolView name="lock.fill" size={14} tintColor={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Photos are read on the Mealz server and aren’t stored.
        </ThemedText>
      </View>
      {costNote && pages.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {costNote}
        </ThemedText>
      )}

      {!busy && (
        <View style={styles.actions}>
          {pages.length > 0 && (
            <Button
              icon="sparkles"
              label={failure && failure !== 'no_credit' ? 'Try Again' : 'Read Recipe'}
              onPress={() => void review()}
            />
          )}
          <Button
            variant={pages.length ? 'secondary' : 'primary'}
            icon="camera"
            label={pages.length ? 'Photograph Another Page' : 'Take Photo'}
            onPress={() => void addPage('camera')}
          />
          <Button
            variant="secondary"
            icon="photo"
            label={pages.length ? 'Add Page from Library' : 'Choose from Library'}
            onPress={() => void addPage('library')}
          />
          {shownFailure && (
            <Button
              variant="secondary"
              icon="square.and.pencil"
              label="Type It In Instead"
              onPress={() => router.replace('/recipe-editor')}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    minHeight: 280,
  },
  title: { fontSize: 28, lineHeight: 34, textAlign: 'center' },
  center: { textAlign: 'center' },
  failure: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  failureText: { flex: 1 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  actions: { gap: Spacing.two },
});
