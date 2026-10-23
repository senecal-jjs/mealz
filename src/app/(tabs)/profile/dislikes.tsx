import { ScrollView, StyleSheet } from 'react-native';

import { DislikePicker } from '@/components/preferences/dislike-picker';
import { Spacing } from '@/constants/theme';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function EditDislikes() {
  const { prefs } = usePreferences();
  const theme = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <DislikePicker
        value={prefs.dislikedIngredientIds}
        onChange={(dislikedIngredientIds) => preferenceActions.save({ dislikedIngredientIds })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: Spacing.three } });
