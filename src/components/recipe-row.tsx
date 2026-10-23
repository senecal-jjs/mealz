import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Recipe } from '@/catalog/types';
import { RecipeImage } from '@/components/recipe-image';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  recipe: Recipe;
  /** Line under the title; defaults to the total time. */
  detail?: string;
  /** Control on the right, e.g. a "Cook again" button. */
  accessory?: React.ReactNode;
};

/** A compact recipe row with a thumbnail that opens the recipe page. */
export function RecipeRow({ recipe, detail, accessory }: Props) {
  return (
    <View style={styles.row}>
      <Link href={{ pathname: '/recipe/[id]', params: { id: recipe.id } }} asChild>
        <Pressable accessibilityRole="button" style={styles.main}>
          <View style={styles.thumb}>
            <RecipeImage recipe={recipe} style={StyleSheet.absoluteFill} iconSize={20} />
          </View>
          <View style={styles.text}>
            <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
              {recipe.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {detail ?? `${recipe.totalMinutes} min`}
            </ThemedText>
          </View>
        </Pressable>
      </Link>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 21 },
});
