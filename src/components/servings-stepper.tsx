import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MAX_SERVINGS, MIN_SERVINGS } from '@/domain/quantity';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: number; onChange: (value: number) => void };

export function ServingsStepper({ value, onChange }: Props) {
  const theme = useTheme();

  const step = (delta: number) => {
    const next = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, value + delta));
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  const button = (icon: SFSymbol, delta: number, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => step(delta)}
      style={[styles.button, { backgroundColor: theme.tintSoft, opacity: disabled ? 0.4 : 1 }]}>
      <SymbolView name={icon} size={14} weight="bold" tintColor={theme.tint} />
    </Pressable>
  );

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Servings"
      accessibilityValue={{ min: MIN_SERVINGS, max: MAX_SERVINGS, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      {button('minus', -1, 'Fewer servings', value <= MIN_SERVINGS)}
      <ThemedText type="smallBold" style={styles.value}>
        {value}
      </ThemedText>
      {button('plus', 1, 'More servings', value >= MAX_SERVINGS)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 18, minWidth: 24, textAlign: 'center' },
});
