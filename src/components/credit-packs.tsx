import type { Product } from 'expo-iap';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsGroup } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCents, PACKS } from '@/features/credit/credit';
import { addPendingPurchases, buyPack, loadPacks, usePurchase } from '@/features/credit/purchases';

const centsFor = (productId: string) => PACKS.find((p) => p.productId === productId)?.cents ?? 0;

/**
 * The credit packs on sale, with App Store prices, and what went wrong with
 * the last purchase. The balance updates on its own once a purchase is added.
 */
export function CreditPacks({ priceCents }: { priceCents: number }) {
  const { buying, error } = usePurchase();
  const [packs, setPacks] = useState<Product[] | null>(null);

  useEffect(() => {
    void loadPacks().then(setPacks, () => setPacks([]));
    // Anything bought but not yet added (e.g. bought offline) is added now.
    void addPendingPurchases();
  }, []);

  return (
    <SettingsGroup
      title="Add credit"
      footer="Credit never expires, and scans Mealz can’t read aren’t charged.">
      {error && <ThemedText style={[styles.row, styles.error]}>{error}</ThemedText>}
      {packs === null ? (
        <ActivityIndicator style={styles.loading} />
      ) : packs.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.row}>
          Credit isn’t available to buy right now.
        </ThemedText>
      ) : (
        packs.map((product) => (
          <View key={product.id} style={styles.row}>
            <View style={styles.text}>
              <ThemedText>{formatCents(centsFor(product.id))} of credit</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                About {Math.floor(centsFor(product.id) / priceCents)} scans
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
  );
}

const styles = StyleSheet.create({
  loading: { padding: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, gap: Spacing.half },
  error: { color: '#E5484D' },
});
