import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { RecipeRow } from '@/components/recipe-row';
import { Spacing } from '@/constants/theme';
import { describeCooked } from '@/domain/history';
import { planActions, usePlannedServings, useHistory } from '@/features/plan/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function HistoryScreen() {
  const theme = useTheme();
  const { getRecipe } = useCatalog();
  const planned = usePlannedServings();
  const { defaultServings } = usePreferences().prefs;
  const items = useHistory().flatMap((item) => {
    const recipe = getRecipe(item.recipeId);
    return recipe && item.cookedAt ? [{ item, recipe, cookedAt: item.cookedAt }] : [];
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title="Nothing cooked yet"
        message="Recipes you finish in cook mode show up here with your rating."
        action={{ label: 'Go to my plan', onPress: () => router.navigate('/plan') }}
      />
    );
  }
  return (
    <FlatList
      data={items}
      keyExtractor={({ item }) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
      )}
      renderItem={({ item: { item, recipe, cookedAt } }) => (
        <RecipeRow
          recipe={recipe}
          detail={describeCooked(cookedAt, item.rating)}
          accessory={
            planned.has(recipe.id) ? (
              <Button
                variant="secondary"
                label="Planned"
                onPress={() => router.navigate('/plan')}
                style={styles.small}
              />
            ) : (
              <Button
                variant="secondary"
                icon="arrow.counterclockwise"
                label="Again"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  planActions.add(recipe.id, item.servings ?? defaultServings);
                }}
                style={styles.small}
              />
            )
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 56 + 32 },
  small: { minHeight: 36, paddingHorizontal: Spacing.three },
});
