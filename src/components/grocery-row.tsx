import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  amount?: string;
  name: string;
  /** Small line under the name, e.g. which recipes use it. */
  detail?: string;
  checked: boolean;
  onToggle: () => void;
};

/** A checkable grocery line: "3 limes" with the recipes that need it underneath. */
export function GroceryRow({ amount, name, detail, checked, onToggle }: Props) {
  const theme = useTheme();
  const label = amount ? `${amount} ${name}` : name;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
      style={[styles.row, { backgroundColor: theme.background }]}>
      <SymbolView
        name={checked ? 'checkmark.circle.fill' : 'circle'}
        size={24}
        tintColor={checked ? theme.tint : theme.textSecondary}
      />
      <View style={styles.text}>
        <ThemedText
          style={[checked && styles.checked, checked && { color: theme.textSecondary }]}
          numberOfLines={2}>
          {amount ? <ThemedText style={styles.amount}>{amount} </ThemedText> : null}
          {name}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    minHeight: 52,
  },
  text: { flex: 1 },
  amount: { fontWeight: 700 },
  checked: { textDecorationLine: 'line-through' },
});
