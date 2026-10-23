import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getIngredient, getRecipe } from '@/catalog';
import { DIET_LABELS, type Recipe } from '@/catalog/types';
import { Button } from '@/components/button';
import { RecipeImage } from '@/components/recipe-image';
import { ServingsStepper } from '@/components/servings-stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatIngredient, scaleFactor } from '@/domain/quantity';
import { planActions, usePlannedServings } from '@/features/plan/hooks';
import { DEFAULT_SERVINGS } from '@/features/plan/plan';
import { useTheme } from '@/hooks/use-theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const plannedServings = usePlannedServings().get(id);
  const [draftServings, setDraftServings] = useState(DEFAULT_SERVINGS);

  if (!recipe) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <ThemedText>This recipe isn’t available.</ThemedText>
      </View>
    );
  }

  // Once planned, the stepper edits the plan; before that it picks how many to add.
  const planned = plannedServings !== undefined;
  const servings = plannedServings ?? draftServings;
  const setServings = (value: number) =>
    planned ? planActions.setServings(recipe.id, value) : setDraftServings(value);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + insets.bottom + Spacing.four }}
        contentInsetAdjustmentBehavior="never">
        <Stack.Screen options={{ title: recipe.title }} />
        <RecipeImage recipe={recipe} style={styles.hero} iconSize={64} />
        <View style={styles.body}>
          <Overview recipe={recipe} />
          <Ingredients recipe={recipe} servings={servings} onServingsChange={setServings} />
          <Steps recipe={recipe} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + Spacing.two, backgroundColor: theme.background },
          { borderColor: theme.border },
        ]}>
        {planned && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
            In your plan · {servings} servings
          </ThemedText>
        )}
        {planned ? (
          <View style={styles.footerRow}>
            <Button
              variant="secondary"
              label="Remove"
              onPress={() => planActions.remove(recipe.id)}
            />
            <Button
              icon="flame.fill"
              label="Start Cooking"
              onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id } })}
              style={styles.footerPrimary}
            />
          </View>
        ) : (
          <Button
            icon="plus"
            label="Add to Plan"
            onPress={() => planActions.add(recipe.id, servings)}
            style={styles.footerButton}
          />
        )}
      </View>
    </View>
  );
}

const FOOTER_HEIGHT = 90;

function Overview({ recipe }: { recipe: Recipe }) {
  const theme = useTheme();
  const allergens = recipe.allergens.join(', ');

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.title}>
        {recipe.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>

      <View style={[styles.facts, { backgroundColor: theme.backgroundElement }]}>
        <Fact label="Prep" value={`${recipe.prepMinutes} min`} />
        <Fact label="Cook" value={`${recipe.cookMinutes} min`} />
        <Fact label="Total" value={`${recipe.totalMinutes} min`} />
        <Fact label="Level" value={recipe.difficulty === 'easy' ? 'Easy' : 'Medium'} />
      </View>

      {recipe.diets.length > 0 && (
        <View style={styles.badges}>
          {recipe.diets.map((d) => (
            <View key={d} style={[styles.badge, { backgroundColor: theme.tintSoft }]}>
              <ThemedText type="small" style={[styles.badgeText, { color: theme.tint }]}>
                {DIET_LABELS[d]}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
      {allergens && (
        <ThemedText type="small" themeColor="textSecondary">
          Contains: {allergens}
        </ThemedText>
      )}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

type IngredientsProps = {
  recipe: Recipe;
  servings: number;
  onServingsChange: (servings: number) => void;
};

function Ingredients({ recipe, servings, onServingsChange }: IngredientsProps) {
  const theme = useTheme();
  const factor = scaleFactor(recipe.baseServings, servings);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" style={styles.heading}>
          Ingredients
        </ThemedText>
        <View style={styles.servings}>
          <ThemedText type="small" themeColor="textSecondary">
            Servings
          </ThemedText>
          <ServingsStepper value={servings} onChange={onServingsChange} />
        </View>
      </View>

      {recipe.ingredients.map((item) => {
        const { amount, name } = formatIngredient(item, getIngredient(item.ingredient), factor);
        return (
          <View key={item.id} style={[styles.ingredient, { borderColor: theme.border }]}>
            <ThemedText style={styles.amount}>{amount || '—'}</ThemedText>
            <View style={styles.ingredientText}>
              <ThemedText>
                {name}
                {item.quantity === null ? ', to taste' : ''}
              </ThemedText>
              {(item.prep || item.optional) && (
                <ThemedText type="small" themeColor="textSecondary">
                  {[item.prep, item.optional && 'optional'].filter(Boolean).join(' · ')}
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Steps({ recipe }: { recipe: Recipe }) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.heading}>
        Instructions
      </ThemedText>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
            <ThemedText type="smallBold" style={{ color: theme.onTint }}>
              {i + 1}
            </ThemedText>
          </View>
          <View style={styles.stepBody}>
            <ThemedText>{step.text}</ThemedText>
            {step.timerMinutes && (
              <View style={[styles.timer, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name="timer" size={14} tintColor={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {step.timerMinutes} min
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      ))}
      {!recipe.reviewed && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
          Draft recipe, not yet reviewed. Hidden in release builds.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  hero: { height: 280 },
  body: { padding: Spacing.three, gap: Spacing.five },
  section: { gap: Spacing.two },
  title: { fontSize: 28, lineHeight: 34 },
  facts: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  heading: { fontSize: 20, lineHeight: 26 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  ingredient: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  amount: { width: 84, fontWeight: 700 },
  ingredientText: { flex: 1 },
  step: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, gap: Spacing.two },
  timer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  footnote: { marginTop: Spacing.four, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  footerButton: { alignSelf: 'stretch' },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  footerPrimary: { flex: 1 },
  footerHint: { textAlign: 'center', fontSize: 12, lineHeight: 16 },
});
