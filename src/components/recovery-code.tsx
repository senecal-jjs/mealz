import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsGroup } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseRecoveryCode } from '@/features/credit/credit';
import { useCredit } from '@/features/credit/store';
import { getWallet, isWalletInICloud, setWallet } from '@/features/credit/wallet';

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
 * The wallet ID scan credit belongs to, shown as a recovery code that moves
 * the credit to another phone. Calls `onChange` after switching to another code.
 */
export function RecoveryCode({ onChange }: { onChange: () => void }) {
  const [wallet, setWalletState] = useState<string | null>(null);
  // Read again whenever the credit changes: checking it can switch to a wallet from iCloud.
  const summary = useCredit((s) => s.summary);
  const inICloud = isWalletInICloud();

  useEffect(() => {
    void getWallet().then(setWalletState);
  }, [summary]);

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
    onChange();
  };

  if (!wallet) return null;
  return (
    <SettingsGroup
      title="Recovery code"
      footer={
        inICloud
          ? 'Mealz has no accounts. Your credit belongs to this code, which is saved in your iCloud, so it comes back on a new iPhone signed in to the same Apple ID. Don’t share it: anyone with it can spend the credit.'
          : 'Mealz has no accounts. Your credit belongs to this code: keep it somewhere safe to use your credit on a new iPhone (signing in to iCloud saves it for you), and don’t share it, since anyone with it can spend the credit.'
      }>
      <ThemedText selectable style={styles.code}>
        {wallet}
      </ThemedText>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          icon="square.and.arrow.up"
          label="Save Code"
          onPress={() => void Share.share({ message: `Mealz recovery code: ${wallet}` })}
          style={styles.button}
        />
        <Button
          variant="secondary"
          icon="key"
          label="Use a Code"
          onPress={() => void enterCode()}
          style={styles.button}
        />
      </View>
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  code: {
    fontFamily: 'ui-monospace',
    fontSize: 14,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  actions: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  button: { flex: 1 },
});
