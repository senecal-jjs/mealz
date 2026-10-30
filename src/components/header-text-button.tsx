import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /** For the screen's main action, like Save. */
  bold?: boolean;
  disabled?: boolean;
};

/**
 * A text button in a screen's header ("Cancel", "Save"). iOS draws a glass
 * capsule around header items that hugs their content, so the label gets
 * padding at its sides to sit in the capsule like an icon does.
 */
export function HeaderTextButton({ label, onPress, bold = false, disabled = false }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      disabled={disabled}
      style={styles.button}>
      <ThemedText style={[styles.label, bold && styles.bold, { color: theme.tint }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: Spacing.two },
  label: { fontSize: 17 },
  bold: { fontWeight: '600' },
});
