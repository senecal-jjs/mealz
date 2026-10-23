import { ScrollView, StyleSheet } from 'react-native';

import { DietPicker } from '@/components/preferences/diet-picker';
import { Spacing } from '@/constants/theme';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function EditDiet() {
  const { prefs } = usePreferences();
  const theme = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <DietPicker value={prefs.diet} onChange={(diet) => preferenceActions.save({ diet })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: Spacing.three } });
