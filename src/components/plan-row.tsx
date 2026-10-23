import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Recipe } from '@/catalog/types';
import { RecipeImage } from '@/components/recipe-image';
import { ServingsStepper } from '@/components/servings-stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DELETE_RED = '#E5484D';

type Props = {
  recipe: Recipe;
  servings: number;
  onServingsChange: (servings: number) => void;
  onRemove: () => void;
};

/** A planned recipe: tap to open, stepper for servings, swipe left to remove. */
export function PlanRow({ recipe, servings, onServingsChange, onRemove }: Props) {
  const theme = useTheme();

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${recipe.title}`}
          onPress={onRemove}
          style={styles.delete}>
          <SymbolView name="trash" size={20} tintColor="#fff" />
          <ThemedText type="smallBold" style={styles.deleteText}>
            Remove
          </ThemedText>
        </Pressable>
      )}>
      <View style={{ backgroundColor: theme.background }}>
        <View style={styles.row}>
          <Link href={{ pathname: '/recipe/[id]', params: { id: recipe.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              // Swiping isn't available to VoiceOver, so offer removal as an action.
              accessibilityActions={[{ name: 'remove', label: 'Remove from plan' }]}
              onAccessibilityAction={onRemove}
              style={styles.main}>
              <View style={styles.thumb}>
                <RecipeImage recipe={recipe} style={StyleSheet.absoluteFill} iconSize={22} />
              </View>
              <View style={styles.text}>
                <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
                  {recipe.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {recipe.totalMinutes} min
                </ThemedText>
              </View>
            </Pressable>
          </Link>
          <ServingsStepper value={servings} onChange={onServingsChange} />
        </View>
        <View style={styles.actions}>
          <Link href={{ pathname: '/cook/[id]', params: { id: recipe.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cook ${recipe.title}`}
              hitSlop={6}
              style={StyleSheet.flatten([styles.cook, { backgroundColor: theme.tintSoft }])}>
              <SymbolView name="flame.fill" size={12} tintColor={theme.tint} />
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Cook
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    paddingLeft: Spacing.three + 64 + Spacing.three,
    paddingBottom: Spacing.two,
  },
  cook: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 21 },
  delete: {
    width: 88,
    backgroundColor: DELETE_RED,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  deleteText: { color: '#fff', fontSize: 12, lineHeight: 16 },
});
