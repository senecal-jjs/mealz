import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { getRecipe } from '@/catalog';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PlanRow } from '@/components/plan-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { planActions, usePlan } from '@/features/plan/hooks';
import { useTheme } from '@/hooks/use-theme';

function confirmClear() {
  Alert.alert('Clear your plan?', 'This removes every recipe from your plan.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: () => planActions.clear() },
  ]);
}

export default function PlanScreen() {
  const theme = useTheme();
  // A recipe can disappear from the catalog in an update; skip those rows.
  const items = usePlan().flatMap((item) => {
    const recipe = getRecipe(item.recipeId);
    return recipe ? [{ item, recipe }] : [];
  });

  if (items.length === 0) {
    return (
      <>
        {/* Header options persist once set, so clear the Clear button explicitly. */}
        <Stack.Screen options={{ headerRight: undefined }} />
        <EmptyState
          icon="fork.knife"
          title="Your plan is empty"
          message="Add recipes from the Recipes tab and they’ll show up here, ready to shop and cook."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/') }}
        />
      </>
    );
  }

  const totalServings = items.reduce((sum, { item }) => sum + item.servings, 0);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={confirmClear}>
              <ThemedText style={{ color: theme.tint }}>Clear</ThemedText>
            </Pressable>
          ),
        }}
      />
      <FlashList
        data={items}
        keyExtractor={({ item }) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
            {items.length} {items.length === 1 ? 'recipe' : 'recipes'} · {totalServings} servings ·
            swipe left to remove
          </ThemedText>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item: { item, recipe } }) => (
          <PlanRow
            recipe={recipe}
            servings={item.servings}
            onServingsChange={(servings) => planActions.setServings(recipe.id, servings)}
            onRemove={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              planActions.remove(recipe.id);
            }}
          />
        )}
        ListFooterComponent={
          <Button
            icon="cart"
            label="View Grocery List"
            onPress={() => router.navigate('/groceries')}
            style={styles.cta}
          />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.six },
  summary: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 + Spacing.three * 2 },
  cta: { marginHorizontal: Spacing.three, marginTop: Spacing.four },
});
