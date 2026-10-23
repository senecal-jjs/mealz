import { ingredientSources, recipeSources } from '@/catalog/data';
import { deriveRecipe } from '@/catalog/derive';
import type { Ingredient, Recipe, RecipeSource } from '@/catalog/types';

export type Catalog = {
  ingredients: Map<string, Ingredient>;
  recipes: Recipe[];
  recipesById: Map<string, Recipe>;
};

/**
 * Builds the in-memory catalog. Only reviewed recipes ship in App Store builds;
 * development and TestFlight builds (EXPO_PUBLIC_INCLUDE_DRAFTS, set in eas.json)
 * show drafts too so they can be checked in the app.
 */
export function buildCatalog(
  ingredients: Ingredient[],
  recipes: RecipeSource[],
  includeDrafts: boolean,
): Catalog {
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  const derived = recipes
    .filter((r) => includeDrafts || r.reviewed)
    .map((r) => deriveRecipe(r, ingredientMap))
    .sort((a, b) => a.title.localeCompare(b.title));
  return {
    ingredients: ingredientMap,
    recipes: derived,
    recipesById: new Map(derived.map((r) => [r.id, r])),
  };
}

const INCLUDE_DRAFTS = __DEV__ || process.env.EXPO_PUBLIC_INCLUDE_DRAFTS === 'true';

export const catalog = buildCatalog(ingredientSources, recipeSources, INCLUDE_DRAFTS);

export function getRecipe(id: string): Recipe | undefined {
  return catalog.recipesById.get(id);
}

export function getIngredient(id: string): Ingredient {
  const ingredient = catalog.ingredients.get(id);
  if (!ingredient) throw new Error(`Unknown ingredient "${id}"`);
  return ingredient;
}
