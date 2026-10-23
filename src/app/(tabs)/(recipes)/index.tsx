import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { catalog } from '@/catalog';
import { Chip } from '@/components/chip';
import { RecipeCard } from '@/components/recipe-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BROWSE_FILTERS, browseRecipes, type BrowseFilter } from '@/domain/browse';
import { useTheme } from '@/hooks/use-theme';

export default function RecipesScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<BrowseFilter>('all');
  const [query, setQuery] = useState('');

  const recipes = useMemo(
    () => browseRecipes(catalog.recipes, catalog.ingredients, filter, query),
    [filter, query],
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
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No recipes match. Try another filter or search.
          </ThemedText>
        }
        renderItem={({ item }) => <RecipeCard recipe={item} />}
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
});
