import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { ALLERGEN_LABELS, DIET_LABELS } from '@/catalog/types';
import { Chip } from '@/components/chip';
import { ServingsStepper } from '@/components/servings-stepper';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fitsPreferences } from '@/domain/preferences';
import { restoreFromProfile } from '@/features/backup/restore';
import { useFavourites } from '@/features/favourites/hooks';
import { useHistory } from '@/features/plan/hooks';
import { preferenceActions, usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

const DELETE_RED = '#E5484D';

function confirmReset() {
  Alert.alert(
    'Reset all data?',
    Platform.OS === 'ios'
      ? 'This deletes your plan, grocery list, history, preferences and recipes from this phone. It can’t be undone, but recipes you added stay in your iCloud backup.'
      : 'This deletes your plan, grocery list, history, preferences and recipes from this phone. It can’t be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => preferenceActions.resetAll() },
    ],
  );
}

/** "Dairy, Peanuts" or "Dairy, Peanuts +2", or "None". */
function summarize(items: string[], max = 2): string {
  if (items.length === 0) return 'None';
  const shown = items.slice(0, max).join(', ');
  return items.length > max ? `${shown} +${items.length - max}` : shown;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const catalog = useCatalog();
  const { prefs } = usePreferences();
  const favouriteCount = useFavourites().length;
  const cookedCount = useHistory().length;
  const matching = catalog.recipes.filter((r) => fitsPreferences(r, prefs)).length;
  const separator = <View style={[styles.separator, { backgroundColor: theme.border }]} />;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <SettingsGroup title="Your kitchen">
        <SettingsRow label="Favourites" value={String(favouriteCount)} href="/profile/favourites" />
        {separator}
        <SettingsRow
          label="Cooking history"
          value={cookedCount === 1 ? '1 meal' : `${cookedCount} meals`}
          href="/profile/history"
        />
      </SettingsGroup>

      <SettingsGroup
        title="Your preferences"
        footer={`${matching} of ${catalog.recipes.length} recipes fit your preferences.`}>
        <SettingsRow
          label="Diet"
          value={prefs.diet ? DIET_LABELS[prefs.diet] : 'No restrictions'}
          href="/profile/diet"
        />
        {separator}
        <SettingsRow
          label="Allergies"
          value={summarize(prefs.allergies.map((a) => ALLERGEN_LABELS[a]))}
          href="/profile/allergies"
        />
        {separator}
        <SettingsRow
          label="Dislikes"
          value={summarize(
            prefs.dislikedIngredientIds.map((id) => catalog.ingredients.get(id)?.name ?? id),
          )}
          href="/profile/dislikes"
        />
      </SettingsGroup>

      <SettingsGroup footer="New recipes start at this many servings.">
        <SettingsRow
          label="Household"
          accessory={
            <ServingsStepper
              value={prefs.defaultServings}
              onChange={(defaultServings) => preferenceActions.save({ defaultServings })}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup footer="Used for amounts on your grocery list.">
        <SettingsRow
          label="Units"
          accessory={
            <View style={styles.units}>
              <Chip
                label="US"
                selected={prefs.units === 'us'}
                onPress={() => preferenceActions.save({ units: 'us' })}
              />
              <Chip
                label="Metric"
                selected={prefs.units === 'metric'}
                onPress={() => preferenceActions.save({ units: 'metric' })}
              />
            </View>
          }
        />
      </SettingsGroup>

      {Platform.OS === 'ios' && (
        <SettingsGroup footer="Recipes you add are backed up to your iCloud Drive, so they come back on a new iPhone.">
          <Pressable
            accessibilityRole="button"
            onPress={() => void restoreFromProfile()}
            style={styles.reset}>
            <ThemedText style={{ color: theme.tint }}>Restore from iCloud</ThemedText>
          </Pressable>
        </SettingsGroup>
      )}

      <SettingsGroup
        footer={
          Platform.OS === 'ios'
            ? 'Mealz has no accounts. Everything lives on this phone, and recipes you add are also in your iCloud.'
            : 'Mealz has no accounts. Everything lives only on this phone.'
        }>
        <Pressable accessibilityRole="button" onPress={confirmReset} style={styles.reset}>
          <ThemedText style={{ color: DELETE_RED }}>Reset all data</ThemedText>
        </Pressable>
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  units: { flexDirection: 'row', gap: Spacing.two },
  reset: { minHeight: 50, justifyContent: 'center', paddingHorizontal: Spacing.three },
});
