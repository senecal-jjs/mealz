import { SymbolView, type SFSymbol } from 'expo-symbols';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: SFSymbol;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
  /** A second, quieter choice under the main one. */
  secondaryAction?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action, secondaryAction }: Props) {
  const theme = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
      style={{ backgroundColor: theme.background }}>
      <SymbolView name={icon} size={48} tintColor={theme.textSecondary} />
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {action && <Button label={action.label} onPress={action.onPress} style={styles.action} />}
      {secondaryAction && (
        <Button
          variant="secondary"
          label={secondaryAction.label}
          onPress={secondaryAction.onPress}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six * 2,
    gap: Spacing.two,
  },
  title: { fontSize: 18, marginTop: Spacing.two },
  message: { textAlign: 'center' },
  action: { marginTop: Spacing.three },
});
