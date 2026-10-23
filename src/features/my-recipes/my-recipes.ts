/**
 * Recipes the user added themselves, and the custom ingredients they use.
 * Both are stored as the same shapes the bundled catalog uses, so the rest of
 * the app treats them like any other recipe (see `useCatalog`).
 */
import { asc, eq, inArray } from 'drizzle-orm';

import type { Ingredient, RecipeSource } from '@/catalog/types';
import { newId } from '@/db/ids';
import { customIngredients, favourites, planItems, userRecipes } from '@/db/schema';
import type { Db } from '@/db/types';

/** User recipe and custom ingredient ids start with this, so they never clash with bundled ids. */
export const USER_ID_PREFIX = 'my-';

export function isUserId(id: string): boolean {
  return id.startsWith(USER_ID_PREFIX);
}

export function newUserRecipeId(): string {
  return `${USER_ID_PREFIX}${newId()}`;
}

/** "Gochujang paste" → "my-gochujang-paste-k3j9". */
export function newCustomIngredientId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${USER_ID_PREFIX}${slug || 'ingredient'}-${Math.random().toString(36).slice(2, 6)}`;
}

export function userRecipesQuery(db: Db) {
  return db.select().from(userRecipes).orderBy(asc(userRecipes.createdAt));
}

export function customIngredientsQuery(db: Db) {
  return db.select().from(customIngredients);
}

/**
 * Creates or replaces a user recipe, along with any custom ingredients it
 * introduces. The recipe's `id` must already be set (see `newUserRecipeId`).
 */
export async function saveUserRecipe(db: Db, recipe: RecipeSource, ingredients: Ingredient[] = []) {
  const now = new Date();
  for (const ingredient of ingredients) {
    await db
      .insert(customIngredients)
      .values({ id: ingredient.id, data: ingredient })
      .onConflictDoUpdate({ target: customIngredients.id, set: { data: ingredient } });
  }
  await db
    .insert(userRecipes)
    .values({ id: recipe.id, data: recipe, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: userRecipes.id, set: { data: recipe, updatedAt: now } });
  await pruneCustomIngredients(db);
}

/**
 * Deletes a user recipe and takes it out of the active plan and favourites.
 * Cooking history keeps its rows; screens skip recipes that no longer exist.
 */
export async function deleteUserRecipe(db: Db, id: string) {
  await db.delete(userRecipes).where(eq(userRecipes.id, id));
  await db.delete(favourites).where(eq(favourites.recipeId, id));
  const active = await db.select().from(planItems).where(eq(planItems.recipeId, id));
  const activeIds = active.filter((i) => i.cookedAt === null).map((i) => i.id);
  if (activeIds.length) await db.delete(planItems).where(inArray(planItems.id, activeIds));
  await pruneCustomIngredients(db);
}

/** Removes custom ingredients no user recipe refers to any more. */
async function pruneCustomIngredients(db: Db) {
  const recipes = await db.select().from(userRecipes);
  const used = new Set(recipes.flatMap((r) => r.data.ingredients.map((i) => i.ingredient)));
  const all = await db.select().from(customIngredients);
  const unused = all.map((c) => c.id).filter((id) => !used.has(id));
  if (unused.length)
    await db.delete(customIngredients).where(inArray(customIngredients.id, unused));
}
