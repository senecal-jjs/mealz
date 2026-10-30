import { FlashList } from '@shopify/flash-list';
import { Link, router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { Chip } from '@/components/chip';
import { RecipeCard } from '@/components/recipe-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BROWSE_FILTERS, browseRecipes, dailyOrder, type BrowseFilter } from '@/domain/browse';
import { fitsPreferences } from '@/domain/preferences';
import { useFavourites } from '@/features/favourites/hooks';
import { planActions, usePlannedServings } from '@/features/plan/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useLocalDay } from '@/hooks/use-local-day';
import { useTheme } from '@/hooks/use-theme';

export default function RecipesScreen() {
  const theme = useTheme();
  const catalog = useCatalog();
  const [filter, setFilter] = useState<BrowseFilter>('all');
  const [query, setQuery] = useState('');
  const planned = usePlannedServings();
  const { prefs } = usePreferences();
  const favouriteIds = useFavourites();

  // Recipes that don't fit the user's diet, allergies or dislikes aren't shown,
  // except the user's own: they added those on purpose.
  const allowed = useMemo(
    () => catalog.recipes.filter((r) => r.mine || fitsPreferences(r, prefs)),
    [catalog, prefs],
  );
  const hasMine = catalog.recipes.some((r) => r.mine);
  const filters = BROWSE_FILTERS.filter((f) => f.id !== 'mine' || hasMine);
  const hidden = catalog.recipes.length - allowed.length;
  // A new order each day helps people find recipes; search results stay alphabetical.
  const day = useLocalDay();
  const recipes = useMemo(() => {
    const found = browseRecipes(allowed, catalog.ingredients, filter, query, new Set(favouriteIds));
    return query.trim() ? found : dailyOrder(found, day);
  }, [allowed, catalog.ingredients, filter, query, favouriteIds, day]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a recipe"
              hitSlop={8}
              onPress={() => router.push('/add-recipe')}>
              <SymbolView name="plus" size={22} tintColor={theme.tint} />
            </Pressable>
          ),
          headerSearchBarOptions: {
            placeholder: 'Search recipes or ingredients',
            onChangeText: (e) => setQuery(e.nativeEvent.text),
          },
        }}
      />
      <FlashList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipRow}>
              {filters.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={filter === f.id}
                  onPress={() => setFilter(f.id)}
                />
              ))}
            </ScrollView>
            {hidden > 0 && (
              <Link href="/profile" style={styles.note}>
                <ThemedText type="small" themeColor="textSecondary">
                  {hidden} {hidden === 1 ? 'recipe' : 'recipes'} hidden by your preferences ·{' '}
                  <ThemedText type="small" style={{ color: theme.tint }}>
                    Edit
                  </ThemedText>
                </ThemedText>
              </Link>
            )}
          </View>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            {filter === 'favourites' && !query
              ? 'No favourites yet. Tap the heart on a recipe to save it here.'
              : 'No recipes match. Try another filter or search.'}
          </ThemedText>
        }
        extraData={planned}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            planned={planned.has(item.id)}
            onTogglePlan={() =>
              planned.has(item.id)
                ? planActions.remove(item.id)
                : planActions.add(item.id, prefs.defaultServings)
            }
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  chipRow: { marginHorizontal: -Spacing.three, marginBottom: Spacing.three },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  separator: { height: Spacing.three },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  note: { marginTop: -Spacing.one, marginBottom: Spacing.three },
});
