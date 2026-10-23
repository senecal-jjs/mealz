import { router } from 'expo-router';

import { DislikePicker } from '@/components/preferences/dislike-picker';
import { OnboardingStep } from '@/components/preferences/onboarding-step';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';

export default function DislikesStep() {
  const { prefs } = usePreferences();
  return (
    <OnboardingStep
      step={3}
      total={4}
      title="Anything you don’t like?"
      subtitle="We’ll skip recipes built around these. Optional garnishes don’t count."
      nextLabel={prefs.dislikedIngredientIds.length ? 'Next' : 'I’ll eat anything'}
      onNext={() => router.push('/onboarding/household')}>
      <DislikePicker
        value={prefs.dislikedIngredientIds}
        onChange={(dislikedIngredientIds) => preferenceActions.save({ dislikedIngredientIds })}
      />
    </OnboardingStep>
  );
}
