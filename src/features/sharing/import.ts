/**
 * What opening a share link does: open a bundled recipe the recipient already
 * has, point at a copy they already saved, or prepare a new user recipe.
 */
import type { Catalog } from '@/catalog';
import type { Ingredient, RecipeSource } from '@/catalog/types';
import { isUserId, newCustomIngredientId, newUserRecipeId } from '@/features/my-recipes/my-recipes';

import type { SharedRecipe, SharePayload } from '@/features/sharing/share-link';

export type ImportPlan =
  | { kind: 'bundled'; id: string }
  | { kind: 'saved'; id: string }
  | {
      kind: 'new';
      recipe: RecipeSource;
      /** Ingredients the recipient doesn't have yet, to save with the recipe. */
      ingredients: Ingredient[];
      /** Every ingredient the recipe uses, for showing it before it's saved. */
      lookup: Map<string, Ingredient>;
    };

export function planImport(payload: SharePayload, catalog: Catalog): ImportPlan {
  const bundled = payload.c ? catalog.recipesById.get(payload.c) : undefined;
  if (bundled && !bundled.mine) return { kind: 'bundled', id: bundled.id };

  const key = fingerprint(payload.r);
  const saved = catalog.recipes.find((r) => r.mine && fingerprint(r) === key);
  if (saved) return { kind: 'saved', id: saved.id };

  // Use the recipient's ingredient where there's one with the same bundled id
  // or the same name; anything else becomes one of their custom ingredients.
  const byName = new Map(
    [...catalog.ingredients.values()].map((i) => [normalise(i.name), i] as const),
  );
  const idFor = new Map<string, string>();
  const ingredients: Ingredient[] = [];
  const lookup = new Map<string, Ingredient>();
  for (const shared of payload.i) {
    const existing =
      (!isUserId(shared.id) && catalog.ingredients.get(shared.id)) ||
      byName.get(normalise(shared.name));
    const ingredient = existing || { ...shared, id: newCustomIngredientId(shared.name) };
    if (!existing) ingredients.push(ingredient);
    idFor.set(shared.id, ingredient.id);
    lookup.set(ingredient.id, ingredient);
  }

  const recipe: RecipeSource = {
    ...payload.r,
    id: newUserRecipeId(),
    image: null,
    reviewed: false,
    ingredients: payload.r.ingredients.map((item) => ({
      ...item,
      ingredient: idFor.get(item.ingredient)!,
    })),
  };
  return { kind: 'new', recipe, ingredients, lookup };
}

const normalise = (name: string) => name.trim().toLowerCase();

/** Same title and steps: the recipe was already saved from this link (or another of it). */
function fingerprint(recipe: Pick<SharedRecipe, 'title' | 'steps'>): string {
  return JSON.stringify([normalise(recipe.title), recipe.steps.map((s) => s.text)]);
}
