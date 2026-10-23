import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: SFSymbol;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, style }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const color = primary ? theme.onTint : theme.tint;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.tint : theme.tintSoft, opacity: pressed ? 0.8 : 1 },
        style,
      ]}>
      {icon && <SymbolView name={icon} size={16} weight="semibold" tintColor={color} />}
      <ThemedText type="smallBold" style={[styles.label, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    borderRadius: 25,
    borderCurve: 'continuous',
  },
  label: { fontSize: 17 },
});
