/**
 * The iCloud Drive backup of the user's own recipes: one JSON file per recipe
 * (with the custom ingredients it uses) in `recipes/`, and its dish photo, if
 * any, in `photos/`. Restoring keeps each recipe's id, so it never duplicates.
 */
import type { Ingredient, RecipeSource } from '@/catalog/types';
import { isUserId } from '@/features/my-recipes/my-recipes';

export const RECIPES_FOLDER = 'recipes';
export const PHOTOS_FOLDER = 'photos';

export type RecipeBackup = {
  v: 1;
  savedAt: string;
  recipe: RecipeSource;
  /** The custom ingredients the recipe uses; bundled ones are looked up by id. */
  ingredients: Ingredient[];
  /** The photo's file name in `photos/`, or null. */
  photo: string | null;
};

export const recipePath = (id: string) => `${RECIPES_FOLDER}/${id}.json`;
export const photoPath = (name: string) => `${PHOTOS_FOLDER}/${name}`;

/** The file name of a photo stored in the app ("recipe-photos/abc.jpg" → "abc.jpg"). */
export function photoName(image: string | null): string | null {
  if (!image || /^[a-z][a-z0-9+.-]*:/i.test(image)) return null;
  return image.split('/').pop() || null;
}

/** A recipe's backup, with only the custom ingredients it uses. */
export function toBackup(
  recipe: RecipeSource,
  custom: Ingredient[],
  now = new Date(),
): RecipeBackup {
  const used = new Set(recipe.ingredients.map((i) => i.ingredient));
  return {
    v: 1,
    savedAt: now.toISOString(),
    recipe,
    ingredients: custom.filter((i) => used.has(i.id)),
    photo: photoName(recipe.image),
  };
}

/** Reads a backup file; null for anything that isn't one of the user's recipes. */
export function parseBackup(text: string): RecipeBackup | null {
  try {
    const b = JSON.parse(text) as RecipeBackup;
    const ok =
      b?.v === 1 &&
      typeof b.recipe?.id === 'string' &&
      isUserId(b.recipe.id) &&
      typeof b.recipe.title === 'string' &&
      Array.isArray(b.recipe.ingredients) &&
      Array.isArray(b.recipe.steps) &&
      Array.isArray(b.ingredients) &&
      b.ingredients.every((i) => typeof i?.id === 'string' && isUserId(i.id));
    return ok ? b : null;
  } catch {
    return null;
  }
}

/** Recipe ids from the file names in `recipes/`. */
export function backedUpIds(fileNames: string[]): string[] {
  return fileNames
    .filter((n) => n.endsWith('.json'))
    .map((n) => n.slice(0, -'.json'.length))
    .filter(isUserId);
}

/** Recipes in the backup that aren't on this phone, leaving out ones the user said no to. */
export function recipesToRestore(
  backedUp: string[],
  onPhone: Set<string>,
  declined: Set<string> = new Set(),
): string[] {
  return backedUp.filter((id) => !onPhone.has(id) && !declined.has(id));
}
