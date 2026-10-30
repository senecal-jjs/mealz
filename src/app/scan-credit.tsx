import type { Product } from 'expo-iap';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { SettingsGroup } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCents, PACKS, parseRecoveryCode } from '@/features/credit/credit';
import { addPendingPurchases, buyPack, loadPacks, usePurchase } from '@/features/credit/purchases';
import { refreshCredit } from '@/features/credit/refresh';
import { useCredit } from '@/features/credit/store';
import { getWallet, setWallet } from '@/features/credit/wallet';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

const centsFor = (productId: string) => PACKS.find((p) => p.productId === productId)?.cents ?? 0;

/** Asks for a recovery code (iOS only has a text prompt), resolving with what was typed. */
function askForCode(): Promise<string | null> {
  return new Promise((resolve) =>
    Alert.prompt(
      'Use a Recovery Code',
      'Enter the recovery code from your other iPhone. The credit on this iPhone’s current code stays with that code.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Use Code', onPress: (text?: string) => resolve(text ?? '') },
      ],
      'plain-text',
    ),
  );
}

/**
 * Scan credit: the balance, free scans left, the packs on sale, and the
 * recovery code that moves the credit to another phone.
 */
export default function ScanCreditScreen() {
  const theme = useTheme();
  const { prefs } = usePreferences();
  const summary = useCredit((s) => s.summary);
  const { buying, error } = usePurchase();
  const [packs, setPacks] = useState<Product[] | null>(null);
  const [wallet, setWalletState] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = () =>
    refreshCredit(prefs).then(
      () => setOffline(false),
      () => setOffline(true),
    );

  useEffect(() => {
    void refresh();
    void getWallet().then(setWalletState);
    void loadPacks().then(setPacks, () => setPacks([]));
    // Anything bought but not yet added (e.g. bought offline) is added now.
    void addPendingPurchases();
    // Asked once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterCode = async () => {
    const text = await askForCode();
    if (text === null) return;
    const code = parseRecoveryCode(text);
    if (!code) {
      Alert.alert('That isn’t a recovery code', 'Check it and try again.');
      return;
    }
    await setWallet(code);
    setWalletState(code);
    await refresh();
  };

  const pricing = summary && summary.priceCents > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scan Credit',
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
              <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>Done</ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={styles.balance}>
          {summary ? (
            <>
              <ThemedText type="title" style={styles.amount}>
                {formatCents(summary.balanceCents)}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                {pricing
                  ? `${summary.freeScansLeft === 1 ? '1 free scan' : `${summary.freeScansLeft} free scans`} left this month. After that, each scan costs ${formatCents(summary.priceCents)}.`
                  : 'Scans are free right now.'}
              </ThemedText>
            </>
          ) : offline ? (
            <>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Couldn’t reach Mealz to check your credit.
              </ThemedText>
              <Button variant="secondary" label="Try Again" onPress={() => void refresh()} />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {pricing && (
          <SettingsGroup
            title="Add credit"
            footer="Credit never expires. Scans Mealz can’t read are free, and scans are always free when read on your iPhone instead.">
            {packs === null ? (
              <ActivityIndicator style={styles.packsLoading} />
            ) : packs.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.pack}>
                Credit isn’t available to buy right now.
              </ThemedText>
            ) : (
              packs.map((product) => (
                <View key={product.id} style={styles.pack}>
                  <View style={styles.packText}>
                    <ThemedText>{formatCents(centsFor(product.id))} of credit</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      About {Math.floor(centsFor(product.id) / summary.priceCents)} scans
                    </ThemedText>
                  </View>
                  {buying === product.id ? (
                    <ActivityIndicator />
                  ) : (
                    <Button label={product.displayPrice} onPress={() => void buyPack(product.id)} />
                  )}
                </View>
              ))
            )}
          </SettingsGroup>
        )}

        {(pricing || (summary?.balanceCents ?? 0) !== 0) && wallet && (
          <SettingsGroup
            title="Recovery code"
            footer="Mealz has no accounts. Your credit belongs to this code: keep it somewhere safe to use your credit on a new iPhone, and don’t share it, since anyone with it can spend the credit.">
            <ThemedText selectable style={styles.code}>
              {wallet}
            </ThemedText>
            <View style={styles.codeActions}>
              <Button
                variant="secondary"
                icon="square.and.arrow.up"
                label="Save Code"
                onPress={() => void Share.share({ message: `Mealz recovery code: ${wallet}` })}
                style={styles.codeButton}
              />
              <Button
                variant="secondary"
                icon="key"
                label="Use a Code"
                onPress={() => void enterCode()}
                style={styles.codeButton}
              />
            </View>
          </SettingsGroup>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  balance: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  amount: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  error: { color: '#E5484D', textAlign: 'center' },
  packsLoading: { padding: Spacing.three },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  packText: { flex: 1, gap: Spacing.half },
  code: {
    fontFamily: 'ui-monospace',
    fontSize: 14,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  codeActions: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  codeButton: { flex: 1 },
});
