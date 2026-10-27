import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useCatalog } from '@/catalog/live';
import { Button } from '@/components/button';
import { IngredientRow } from '@/components/editor/ingredient-row';
import { StepRow } from '@/components/editor/step-row';
import { RecipeImage } from '@/components/recipe-image';
import { ServingsStepper } from '@/components/servings-stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  draftIngredient,
  draftStep,
  draftToRecipe,
  emptyDraft,
  recipeToDraft,
  type RecipeDraft,
} from '@/domain/recipe-draft';
import { usePendingDraft } from '@/features/my-recipes/draft-store';
import { myRecipeActions } from '@/features/my-recipes/hooks';
import { newCustomIngredientId, newUserRecipeId } from '@/features/my-recipes/my-recipes';
import { savePhoto } from '@/features/my-recipes/photos';
import { choosePhotoSource, pickPhoto } from '@/features/my-recipes/pick-photo';
import { usePreferences } from '@/features/preferences/hooks';
import { useTheme } from '@/hooks/use-theme';

/** True for a photo that was just picked and isn't saved into app storage yet. */
const isUnsavedPhoto = (image: string | null) => !!image && /^[a-z]+:/i.test(image);

export default function RecipeEditorScreen() {
  const { id, source, reader } = useLocalSearchParams<{ id?: string; source?: string; reader?: string }>();
  const theme = useTheme();
  const catalog = useCatalog();
  const { defaultServings } = usePreferences().prefs;
  const existing = id ? catalog.getRecipe(id) : undefined;

  const [draft, setDraft] = useState<RecipeDraft>(() => {
    if (existing) return recipeToDraft(existing, catalog.ingredients);
    if (source === 'scan') return usePendingDraft.getState().take() ?? emptyDraft(defaultServings);
    return emptyDraft(defaultServings);
  });
  const [initial] = useState(() => JSON.stringify(draft));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== initial;

  const update = (patch: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setIngredient = (index: number, item: RecipeDraft['ingredients'][number]) =>
    setDraft((d) => ({ ...d, ingredients: d.ingredients.map((x, i) => (i === index ? item : x)) }));
  const setStep = (index: number, step: RecipeDraft['steps'][number]) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((x, i) => (i === index ? step : x)) }));

  const cancel = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = async () => {
    const recipeId = draft.id ?? newUserRecipeId();
    const result = draftToRecipe(
      { ...draft, id: recipeId },
      catalog.ingredients,
      newCustomIngredientId,
    );
    if (!result.ok) {
      Alert.alert('Almost there', result.problems.join('\n'));
      return;
    }
    setSaving(true);
    try {
      const image = isUnsavedPhoto(draft.image) ? await savePhoto(draft.image!) : draft.image;
      await myRecipeActions.save(
        { ...result.recipe, image },
        result.newIngredients,
        existing?.image,
      );
      if (existing) router.back();
      else router.replace({ pathname: '/recipe/[id]', params: { id: recipeId } });
    } catch (e) {
      setSaving(false);
      Alert.alert('Couldn’t save the recipe', String(e));
    }
  };

  const confirmDelete = (recipe: NonNullable<typeof existing>) =>
    Alert.alert(`Delete “${recipe.title}”?`, 'It’s also removed from your plan and favourites.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await myRecipeActions.remove(recipe);
          router.dismissTo('/');
        },
      },
    ]);

  const editPhoto = () =>
    choosePhotoSource(
      draft.image ? 'Change photo' : 'Add a photo',
      async (from) => {
        const uri = await pickPhoto(from, { crop: true });
        if (uri) update({ image: uri });
      },
      draft.image ? { label: 'Remove Photo', onPress: () => update({ image: null }) } : undefined,
    );

  const numberField = (
    label: string,
    value: number | null,
    onChange: (n: number | null) => void,
  ) => (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.minutes}>
        <TextInput
          value={value ? String(value) : ''}
          onChangeText={(t) => {
            const n = Number.parseInt(t, 10);
            onChange(Number.isFinite(n) && n > 0 ? n : null);
          }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={`${label} minutes`}
          style={[
            styles.minutesInput,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          min
        </ThemedText>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Edit Recipe' : 'New Recipe',
          gestureEnabled: !dirty,
          headerLeft: () => (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={cancel}>
              <ThemedText style={{ color: theme.tint }}>Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={save} disabled={saving}>
              <ThemedText type="smallBold" style={[styles.save, { color: theme.tint }]}>
                {saving ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {__DEV__ && source === 'scan' && reader && (
          <ThemedText type="small" themeColor="textSecondary">
            Dev: organized with {reader === 'model' ? 'Apple Intelligence' : 'rule-based parser'}
          </ThemedText>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={draft.image ? 'Change photo' : 'Add a photo'}
          onPress={editPhoto}
          style={[styles.photo, { backgroundColor: theme.backgroundElement }]}>
          {draft.image ? (
            <RecipeImage
              recipe={{ id: draft.id ?? 'new', image: draft.image }}
              style={styles.photoImage}
            />
          ) : (
            <View style={styles.photoEmpty}>
              <SymbolView name="camera" size={28} tintColor={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Add a photo of the dish
              </ThemedText>
            </View>
          )}
        </Pressable>

        <TextInput
          value={draft.title}
          onChangeText={(title) => update({ title })}
          placeholder="Recipe name"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Recipe name"
          style={[styles.title, { color: theme.text }]}
        />
        <TextInput
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder="A short description (optional)"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Description"
          multiline
          style={[styles.description, { color: theme.text }]}
        />

        <View style={[styles.facts, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Serves
            </ThemedText>
            <ServingsStepper value={draft.servings} onChange={(servings) => update({ servings })} />
          </View>
          {numberField('Prep', draft.prepMinutes, (prepMinutes) => update({ prepMinutes }))}
          {numberField('Cook', draft.cookMinutes, (cookMinutes) => update({ cookMinutes }))}
        </View>

        <ThemedText type="smallBold" style={styles.heading}>
          Ingredients
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          One per line, with the amount first. You can paste a whole list.
        </ThemedText>
        {draft.ingredients.map((item, i) => (
          <IngredientRow
            key={item.key}
            item={item}
            index={i}
            known={catalog.ingredients}
            onChange={(next) => setIngredient(i, next)}
            onPasteLines={(lines) =>
              setDraft((d) => ({
                ...d,
                ingredients: [
                  ...d.ingredients.slice(0, i + 1),
                  ...lines.map((l) => draftIngredient(l)),
                  ...d.ingredients.slice(i + 1),
                ],
              }))
            }
            onRemove={() =>
              setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, j) => j !== i) }))
            }
          />
        ))}
        <Button
          variant="secondary"
          icon="plus"
          label="Add ingredient"
          onPress={() =>
            setDraft((d) => ({ ...d, ingredients: [...d.ingredients, draftIngredient()] }))
          }
          style={styles.add}
        />

        <ThemedText type="smallBold" style={styles.heading}>
          Steps
        </ThemedText>
        {draft.steps.map((step, i) => (
          <StepRow
            key={step.key}
            step={step}
            index={i}
            onChange={(next) => setStep(i, next)}
            onRemove={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))}
          />
        ))}
        <Button
          variant="secondary"
          icon="plus"
          label="Add step"
          onPress={() => setDraft((d) => ({ ...d, steps: [...d.steps, draftStep()] }))}
          style={styles.add}
        />

        {existing && (
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmDelete(existing)}
            style={styles.delete}>
            <ThemedText style={styles.deleteText}>Delete Recipe</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six * 2 },
  save: { fontSize: 17 },
  photo: { height: 180, borderRadius: 16, overflow: 'hidden', borderCurve: 'continuous' },
  photoImage: { height: 180 },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  title: { fontSize: 26, fontWeight: 700, marginTop: Spacing.three },
  description: { fontSize: 17 },
  facts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    marginTop: Spacing.two,
  },
  field: { gap: Spacing.one },
  minutes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  minutesInput: {
    minWidth: 52,
    textAlign: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 8,
    fontSize: 17,
  },
  heading: { fontSize: 20, lineHeight: 26, marginTop: Spacing.four },
  add: { alignSelf: 'flex-start', marginTop: Spacing.two },
  delete: { alignSelf: 'center', marginTop: Spacing.six, padding: Spacing.three },
  deleteText: { color: '#E5484D', fontSize: 17 },
});
