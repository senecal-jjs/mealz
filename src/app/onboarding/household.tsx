import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/preferences/onboarding-step';
import { ServingsStepper } from '@/components/servings-stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function HouseholdStep() {
  const { prefs } = usePreferences();
  const theme = useTheme();
  const n = prefs.defaultServings;

  return (
    <OnboardingStep
      step={4}
      total={4}
      title="How many do you cook for?"
      subtitle="New recipes start at this many servings. You can change it for any recipe."
      nextLabel="Start planning"
      // Finishing flips the route guard in the root layout, which opens the tabs.
      onNext={() => preferenceActions.finishOnboarding()}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ServingsStepper
          value={n}
          onChange={(defaultServings) => preferenceActions.save({ defaultServings })}
        />
        <ThemedText themeColor="textSecondary">
          {n === 1 ? 'Just me' : `${n} servings per meal`}
        </ThemedText>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: Spacing.three, padding: Spacing.five, borderRadius: 16 },
});
