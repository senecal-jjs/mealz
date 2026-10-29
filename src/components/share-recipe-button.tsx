import { SymbolView } from 'expo-symbols';
import { Pressable, Share, StyleSheet } from 'react-native';

import { useCatalog } from '@/catalog/live';
import type { Recipe } from '@/catalog/types';
import { shareMessage, sharePayload } from '@/features/sharing/share-link';
import { useTheme } from '@/hooks/use-theme';

/** Opens the share sheet with a link that carries the whole recipe. */
export function ShareRecipeButton({ recipe }: { recipe: Recipe }) {
  const theme = useTheme();
  const { getIngredient } = useCatalog();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Share ${recipe.title}`}
      hitSlop={8}
      onPress={() => Share.share({ message: shareMessage(sharePayload(recipe, getIngredient)) })}
      style={[styles.button, { backgroundColor: theme.background }]}>
      <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
