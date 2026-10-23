import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  /** Radio for pick-one lists, checkbox for pick-many. */
  kind: 'radio' | 'checkbox';
  onPress: () => void;
};

export function OptionRow({ title, subtitle, selected, kind, onPress }: Props) {
  const theme = useTheme();
  const icon =
    kind === 'radio'
      ? selected
        ? 'checkmark.circle.fill'
        : 'circle'
      : selected
        ? 'checkmark.square.fill'
        : 'square';

  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.row,
        {
          backgroundColor: selected ? theme.tintSoft : theme.backgroundElement,
          borderColor: selected ? theme.tint : 'transparent',
        },
      ]}>
      <View style={styles.text}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <SymbolView name={icon} size={24} tintColor={selected ? theme.tint : theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 17, lineHeight: 22 },
});
