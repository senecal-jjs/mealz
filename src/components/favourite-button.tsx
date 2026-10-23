import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { favouriteActions, useFavourites } from '@/features/favourites/hooks';
import { useTheme } from '@/hooks/use-theme';

const HEART_RED = '#E5484D';

/** Heart toggle for the recipe page header. */
export function FavouriteButton({ recipeId, title }: { recipeId: string; title: string }) {
  const theme = useTheme();
  const favourite = useFavourites().includes(recipeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        favourite ? `Remove ${title} from favourites` : `Save ${title} to favourites`
      }
      accessibilityState={{ selected: favourite }}
      hitSlop={8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        favouriteActions.set(recipeId, !favourite);
      }}
      style={[styles.button, { backgroundColor: theme.background }]}>
      <SymbolView
        name={favourite ? 'heart.fill' : 'heart'}
        size={18}
        tintColor={favourite ? HEART_RED : theme.text}
      />
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
