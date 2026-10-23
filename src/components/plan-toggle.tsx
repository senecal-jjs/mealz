import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = { planned: boolean; title: string; onToggle: () => void };

/** Round +/✓ button for adding a recipe to the plan straight from a card. */
export function PlanToggle({ planned, title, onToggle }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={planned ? `Remove ${title} from plan` : `Add ${title} to plan`}
      accessibilityState={{ selected: planned }}
      hitSlop={8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={[
        styles.button,
        planned
          ? { backgroundColor: theme.tint }
          : { backgroundColor: theme.background, borderColor: theme.border },
      ]}>
      <SymbolView
        name={planned ? 'checkmark' : 'plus'}
        size={18}
        weight="bold"
        tintColor={planned ? theme.onTint : theme.tint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
});
