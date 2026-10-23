import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Recipe } from '@/catalog/types';
import { DIET_LABELS } from '@/catalog/types';
import { RecipeImage } from '@/components/recipe-image';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Diets worth calling out on a card; low-carb and vegan say the most. */
function headlineDiet(recipe: Recipe): string | null {
  if (recipe.diets.includes('vegan')) return DIET_LABELS.vegan;
  if (recipe.diets.includes('vegetarian')) return DIET_LABELS.vegetarian;
  if (recipe.diets.includes('low-carb')) return DIET_LABELS['low-carb'];
  return null;
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const theme = useTheme();
  const diet = headlineDiet(recipe);

  return (
    <Link href={{ pathname: '/recipe/[id]', params: { id: recipe.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${recipe.title}, ${recipe.totalMinutes} minutes`}
        // Link's asChild slot needs a single flattened style object.
        style={StyleSheet.flatten([styles.card, { backgroundColor: theme.backgroundElement }])}>
        <RecipeImage recipe={recipe} style={styles.image} />
        <View style={styles.body}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {recipe.title}
          </ThemedText>
          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textSecondary">
              {recipe.totalMinutes} min
            </ThemedText>
            {diet && (
              <View style={[styles.badge, { backgroundColor: theme.tintSoft }]}>
                <ThemedText type="small" style={[styles.badgeText, { color: theme.tint }]}>
                  {diet}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', borderCurve: 'continuous' },
  image: { aspectRatio: 16 / 9 },
  body: { padding: Spacing.three, gap: Spacing.one },
  title: { fontSize: 17, lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
});
