import { ScrollView, StyleSheet } from 'react-native';

import { AllergyPicker } from '@/components/preferences/allergy-picker';
import { Spacing } from '@/constants/theme';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function EditAllergies() {
  const { prefs } = usePreferences();
  const theme = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <AllergyPicker
        value={prefs.allergies}
        onChange={(allergies) => preferenceActions.save({ allergies })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: Spacing.three } });
