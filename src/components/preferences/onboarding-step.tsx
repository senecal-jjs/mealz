import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle: string;
  nextLabel: string;
  onNext: () => void;
  children: React.ReactNode;
};

/** Layout for one onboarding question: progress, question, answers, and a pinned button. */
export function OnboardingStep({
  step,
  total,
  title,
  subtitle,
  nextLabel,
  onNext,
  children,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          STEP {step} OF {total}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
        <View style={styles.answers}>{children}</View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + Spacing.two, borderColor: theme.border },
        ]}>
        <Button label={nextLabel} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.five },
  title: { fontSize: 30, lineHeight: 36 },
  answers: { marginTop: Spacing.three },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
