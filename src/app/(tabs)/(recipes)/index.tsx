import { FlashList } from '@shopify/flash-list';
import { Link, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { catalog } from '@/catalog';
import { Chip } from '@/components/chip';
import { RecipeCard } from '@/components/recipe-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BROWSE_FILTERS, browseRecipes, type BrowseFilter } from '@/domain/browse';
import { fitsPreferences } from '@/domain/preferences';
import { useFavourites } from '@/features/favourites/hooks';
import { planActions, usePlannedServings } from '@/features/plan/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function RecipesScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<BrowseFilter>('all');
  const [query, setQuery] = useState('');
  const planned = usePlannedServings();
  const { prefs } = usePreferences();
  const favouriteIds = useFavourites();

  // Recipes that don't fit the user's diet, allergies or dislikes are never shown.
  const allowed = useMemo(() => catalog.recipes.filter((r) => fitsPreferences(r, prefs)), [prefs]);
  const hidden = catalog.recipes.length - allowed.length;
  const recipes = useMemo(
    () => browseRecipes(allowed, catalog.ingredients, filter, query, new Set(favouriteIds)),
    [allowed, filter, query, favouriteIds],
  );

  return (
    <>
      <Stack.Screen
        options={{
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
              {BROWSE_FILTERS.map((f) => (
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
