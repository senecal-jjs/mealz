import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { EmptyState } from '@/components/empty-state';
import { RecipeRow } from '@/components/recipe-row';
import { useFavourites } from '@/features/favourites/hooks';
import { useTheme } from '@/hooks/use-theme';

export default function FavouritesScreen() {
  const theme = useTheme();
  const { getRecipe } = useCatalog();
  const recipes = useFavourites().flatMap((id) => getRecipe(id) ?? []);

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="heart"
        title="No favourites yet"
        message="Tap the heart on any recipe to keep it here."
        action={{ label: 'Browse recipes', onPress: () => router.navigate('/') }}
      />
    );
  }
  return (
    <FlatList
      data={recipes}
      keyExtractor={(r) => r.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
      )}
      renderItem={({ item }) => <RecipeRow recipe={item} />}
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 56 + 32 },
});
