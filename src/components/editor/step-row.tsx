import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { detectTimerMinutes, type DraftStep } from '@/domain/recipe-draft';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  step: DraftStep;
  index: number;
  onChange: (step: DraftStep) => void;
  onRemove: () => void;
};

export function StepRow({ step, index, onChange, onRemove }: Props) {
  const theme = useTheme();
  const detected = detectTimerMinutes(step.text);

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <View style={[styles.number, { backgroundColor: theme.tint }]}>
        <ThemedText type="smallBold" style={{ color: theme.onTint }}>
          {index + 1}
        </ThemedText>
      </View>
      <View style={styles.body}>
        <TextInput
          value={step.text}
          onChangeText={(text) => onChange({ ...step, text })}
          placeholder={
            index === 0 ? 'e.g. Heat the oil and cook the onion for 5 minutes.' : 'Next step'
          }
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={`Step ${index + 1}`}
          multiline
          style={[styles.input, { color: theme.text }]}
        />
        <View style={styles.timer}>
          <SymbolView name="timer" size={14} tintColor={theme.textSecondary} />
          <TextInput
            value={step.timerMinutes ? String(step.timerMinutes) : ''}
            onChangeText={(t) => {
              const n = Number.parseInt(t, 10);
              onChange({ ...step, timerMinutes: Number.isFinite(n) && n > 0 ? n : null });
            }}
            placeholder={detected ? String(detected) : '—'}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={`Timer minutes for step ${index + 1}`}
            keyboardType="number-pad"
            style={[
              styles.timerInput,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {detected && !step.timerMinutes ? 'min timer (from the text)' : 'min timer'}
          </ThemedText>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove step ${index + 1}`}
        hitSlop={8}
        onPress={onRemove}>
        <SymbolView name="minus.circle.fill" size={22} tintColor="#E5484D" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: Spacing.two },
  input: { fontSize: 17, minHeight: 44 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timerInput: {
    minWidth: 44,
    textAlign: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    fontSize: 15,
  },
});
