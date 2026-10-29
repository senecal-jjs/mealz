import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '@/catalog/live';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatIngredient } from '@/domain/quantity';
import { myRecipeActions } from '@/features/my-recipes/hooks';
import { planImport, type ImportPlan } from '@/features/sharing/import';
import { decodeShareData } from '@/features/sharing/share-link';
import { useTheme } from '@/hooks/use-theme';

/** Opened by a recipe share link (see `+native-intent.tsx`). */
export default function ImportRecipeScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>();
  const catalog = useCatalog();
  const theme = useTheme();
  // Planned once: after saving, the live catalog would turn this into "saved".
  const [plan] = useState<ImportPlan | null>(() => {
    const payload = d ? decodeShareData(d) : null;
    return payload && planImport(payload, catalog);
  });

  if (plan?.kind === 'bundled') {
    return <Redirect href={{ pathname: '/recipe/[id]', params: { id: plan.id } }} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Shared Recipe' }} />
      {!plan ? (
        <Message
          text="This link doesn’t contain a recipe Mealz can read. It may have been cut off, or it may need a newer version of Mealz."
          action="Close"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : plan.kind === 'saved' ? (
        <Message
          text="You’ve already saved this recipe."
          action="Open It"
          onPress={() => router.replace({ pathname: '/recipe/[id]', params: { id: plan.id } })}
        />
      ) : (
        <Preview plan={plan} />
      )}
    </View>
  );
}

function Message({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.message}>
      <ThemedText style={styles.center}>{text}</ThemedText>
      <Button label={action} onPress={onPress} />
    </View>
  );
}

function Preview({ plan }: { plan: Extract<ImportPlan, { kind: 'new' }> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const { recipe } = plan;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await myRecipeActions.save(recipe, plan.ingredients);
      router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
    } catch {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]}>
        <View style={styles.section}>
          <ThemedText type="subtitle">{recipe.title}</ThemedText>
          {recipe.description ? (
            <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Serves {recipe.baseServings} · {recipe.prepMinutes + recipe.cookMinutes} min
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.heading}>
            Ingredients
          </ThemedText>
          {recipe.ingredients.map((item) => {
            const { amount, name } = formatIngredient(item, plan.lookup.get(item.ingredient)!);
            return (
              <ThemedText key={item.id}>
                {amount ? <ThemedText style={styles.bold}>{amount} </ThemedText> : null}
                {name}
                {item.quantity === null ? ', to taste' : ''}
                {item.prep ? `, ${item.prep}` : ''}
                {item.optional ? ' (optional)' : ''}
              </ThemedText>
            );
          })}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.heading}>
            Instructions
          </ThemedText>
          {recipe.steps.map((step, i) => (
            <ThemedText key={i}>
              <ThemedText style={styles.bold}>{i + 1}. </ThemedText>
              {step.text}
            </ThemedText>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + Spacing.two, backgroundColor: theme.background },
          { borderColor: theme.border },
        ]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Saved recipes are yours to edit, and stay on this phone.
        </ThemedText>
        <Button icon="square.and.arrow.down" label="Save to My Recipes" onPress={save} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  message: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four },
  center: { textAlign: 'center' },
  body: { padding: Spacing.three, gap: Spacing.five },
  section: { gap: Spacing.two },
  heading: { fontSize: 20, lineHeight: 26 },
  bold: { fontWeight: 700 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
