import { router } from 'expo-router';

import { DietPicker } from '@/components/preferences/diet-picker';
import { OnboardingStep } from '@/components/preferences/onboarding-step';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';

export default function DietStep() {
  const { prefs } = usePreferences();
  return (
    <OnboardingStep
      step={1}
      total={4}
      title="Do you follow a diet?"
      subtitle="We’ll only show recipes that fit it."
      nextLabel="Next"
      onNext={() => router.push('/onboarding/allergies')}>
      <DietPicker value={prefs.diet} onChange={(diet) => preferenceActions.save({ diet })} />
    </OnboardingStep>
  );
}
