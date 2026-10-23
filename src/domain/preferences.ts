import type { Allergen, Diet, Recipe } from '@/catalog/types';

export type RecipeFilterPrefs = {
  diet: Diet | null;
  allergies: Allergen[];
  dislikedIngredientIds: string[];
};

/**
 * Whether a recipe fits the user's diet, allergies and dislikes. Optional
 * ingredients don't count, since they can be left out.
 */
export function fitsPreferences(recipe: Recipe, prefs: RecipeFilterPrefs): boolean {
  if (prefs.diet && !recipe.diets.includes(prefs.diet)) return false;
  if (prefs.allergies.some((a) => recipe.allergens.includes(a))) return false;
  const disliked = new Set(prefs.dislikedIngredientIds);
  return !recipe.ingredients.some((i) => !i.optional && disliked.has(i.ingredient));
}
