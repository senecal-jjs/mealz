import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import type { Recipe } from '@/catalog/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { HeaderTextButton } from '@/components/header-text-button';
import { RecipeRow } from '@/components/recipe-row';
import { ServingsStepper } from '@/components/servings-stepper';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BROWSE_FILTERS, matchesFilter, type BrowseFilter } from '@/domain/browse';
import {
  buildPlan,
  DEFAULT_MEALS,
  MAX_MEALS,
  MIN_MEALS,
  swapPick,
  type PlanContext,
} from '@/domain/meal-plan';
import { fitsPreferences } from '@/domain/preferences';
import { useFavourites } from '@/features/favourites/hooks';
import { planActions, useHistory, usePlan } from '@/features/plan/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

/** The Recipes tab's filters that make sense for a plan; none are on at first. */
const PLAN_FILTERS: BrowseFilter[] = [
  'quick',
  'one-pan',
  'kid-friendly',
  'high-carb',
  'favourites',
];
const filterLabel = (id: BrowseFilter) => BROWSE_FILTERS.find((f) => f.id === id)?.label ?? id;

const meals = (n: number) => (n === 1 ? '1 meal' : `${n} meals`);

/**
 * "Build Me a Plan": choose how many meals and servings (and optionally
 * filters), see a varied set of recipes that fit your preferences, swap any
 * you don't fancy, then add them to My Plan.
 */
export default function BuildPlanScreen() {
  const theme = useTheme();
  const catalog = useCatalog();
  const { prefs } = usePreferences();
  const favourites = useFavourites();
  const history = useHistory();
  const plan = usePlan();

  const [count, setCount] = useState(DEFAULT_MEALS);
  const [servings, setServings] = useState(prefs.defaultServings);
  const [filters, setFilters] = useState<BrowseFilter[]>([]);
  const [picks, setPicks] = useState<Recipe[] | null>(null);
  const [adding, setAdding] = useState(false);

  const favouriteIds = useMemo(() => new Set(favourites), [favourites]);
  const inPlan = useMemo(() => new Set(plan.map((i) => i.recipeId)), [plan]);
  const context: PlanContext = {
    ingredients: catalog.ingredients,
    favourites: favouriteIds,
    history: history.map((h) => ({ recipeId: h.recipeId, cookedAt: h.cookedAt, rating: h.rating })),
    now: new Date(),
  };
  // Recipes the user can eat (their own always count), narrowed by any filters.
  const candidates = catalog.recipes.filter(
    (r) =>
      (r.mine || fitsPreferences(r, prefs)) &&
      filters.every((f) => matchesFilter(r, f, favouriteIds)),
  );

  const toggle = (id: BrowseFilter) =>
    setFilters((current) =>
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id],
    );

  const build = () => setPicks(buildPlan(candidates, count, context, inPlan));

  const swap = (index: number) => {
    if (!picks) return;
    const next = swapPick(candidates, picks, index, context, inPlan);
    if (!next) {
      Alert.alert(
        'No other recipes fit',
        'Try fewer filters, or change your preferences in Profile.',
      );
      return;
    }
    void Haptics.selectionAsync();
    setPicks(picks.map((p, i) => (i === index ? next : p)));
  };

  const add = async (replace: boolean) => {
    if (!picks || adding) return;
    setAdding(true);
    if (replace) await planActions.clear();
    for (const recipe of picks) await planActions.add(recipe.id, servings);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const confirmReplace = () =>
    Alert.alert('Replace your plan?', 'This removes the recipes in your plan and adds these.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: () => void add(true) },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Build Me a Plan',
          headerLeft: () => <HeaderTextButton label="Cancel" onPress={() => router.back()} />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {picks === null ? (
          <>
            <SettingsGroup footer="Recipes are picked to fit your diet, allergies and dislikes, with a mix of proteins.">
              <SettingsRow
                label="Meals"
                accessory={
                  <ServingsStepper
                    value={count}
                    onChange={setCount}
                    min={MIN_MEALS}
                    max={MAX_MEALS}
                    noun="meals"
                  />
                }
              />
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                label="Servings each"
                accessory={<ServingsStepper value={servings} onChange={setServings} />}
              />
            </SettingsGroup>

            <View style={styles.filters}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filtersTitle}>
                ONLY INCLUDE (OPTIONAL)
              </ThemedText>
              <View style={styles.chips}>
                {PLAN_FILTERS.map((id) => (
                  <Chip
                    key={id}
                    label={filterLabel(id)}
                    selected={filters.includes(id)}
                    onPress={() => toggle(id)}
                  />
                ))}
              </View>
            </View>

            {candidates.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.center}>
                No recipes fit these filters and your preferences. Try fewer filters.
              </ThemedText>
            ) : (
              <Button icon="sparkles" label="Build My Plan" onPress={build} />
            )}
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {picks.length < count
                ? `Only ${meals(picks.length)} fit your preferences and filters.`
                : `${meals(picks.length)}, ${servings} servings each. Swap any you don’t fancy.`}
            </ThemedText>

            {picks.length > 0 && (
              <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
                {picks.map((recipe, index) => (
                  <View key={recipe.id}>
                    {index > 0 && (
                      <View style={[styles.rowSeparator, { backgroundColor: theme.border }]} />
                    )}
                    <RecipeRow
                      recipe={recipe}
                      accessory={
                        <Button
                          variant="secondary"
                          icon="arrow.triangle.2.circlepath"
                          label="Swap"
                          onPress={() => swap(index)}
                          style={styles.small}
                        />
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              {picks.length > 0 &&
                (plan.length === 0 ? (
                  <Button icon="plus" label="Add to Plan" onPress={() => void add(false)} />
                ) : (
                  <>
                    <Button
                      icon="plus"
                      label="Add to Current Plan"
                      onPress={() => void add(false)}
                    />
                    <Button variant="secondary" label="Replace Plan" onPress={confirmReplace} />
                  </>
                ))}
              <Button variant="secondary" label="Start Over" onPress={() => setPicks(null)} />
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  filters: { gap: Spacing.two },
  filtersTitle: { paddingHorizontal: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: { textAlign: 'center' },
  list: { borderRadius: 16, overflow: 'hidden' },
  rowSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 56 + 32 },
  small: { minHeight: 36, paddingHorizontal: Spacing.three },
  actions: { gap: Spacing.two },
});
