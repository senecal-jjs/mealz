import { router } from 'expo-router';

import { AllergyPicker } from '@/components/preferences/allergy-picker';
import { OnboardingStep } from '@/components/preferences/onboarding-step';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';

export default function AllergiesStep() {
  const { prefs } = usePreferences();
  return (
    <OnboardingStep
      step={2}
      total={4}
      title="Any allergies?"
      subtitle="Recipes containing these are hidden. Always double-check labels when you shop."
      nextLabel={prefs.allergies.length ? 'Next' : 'No allergies'}
      onNext={() => router.push('/onboarding/dislikes')}>
      <AllergyPicker
        value={prefs.allergies}
        onChange={(allergies) => preferenceActions.save({ allergies })}
      />
    </OnboardingStep>
  );
}
