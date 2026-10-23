import { ingredientSources, recipeSources } from '@/catalog/data';
import { deriveRecipe } from '@/catalog/derive';
import type { Ingredient, Recipe, RecipeSource } from '@/catalog/types';

export type Catalog = {
  ingredients: Map<string, Ingredient>;
  recipes: Recipe[];
  recipesById: Map<string, Recipe>;
};

/** The user's own recipes and the custom ingredients they use. */
export type UserContent = { recipes: RecipeSource[]; ingredients: Ingredient[] };

/**
 * Builds the in-memory catalog. Only reviewed recipes ship in App Store builds;
 * development and TestFlight builds (EXPO_PUBLIC_INCLUDE_DRAFTS, set in eas.json)
 * show drafts too so they can be checked in the app.
 */
export function buildCatalog(
  ingredients: Ingredient[],
  recipes: RecipeSource[],
  includeDrafts: boolean,
  user: UserContent = { recipes: [], ingredients: [] },
): Catalog {
  const ingredientMap = new Map([...ingredients, ...user.ingredients].map((i) => [i.id, i]));
  const bundled = recipes
    .filter((r) => includeDrafts || r.reviewed)
    .map((r) => deriveRecipe(r, ingredientMap));
  // A user recipe that refers to a missing ingredient is skipped, not fatal.
  const mine = user.recipes.flatMap((r) => {
    try {
      return [deriveRecipe(r, ingredientMap, true)];
    } catch {
      return [];
    }
  });
  const derived = [...bundled, ...mine].sort((a, b) => a.title.localeCompare(b.title));
  return {
    ingredients: ingredientMap,
    recipes: derived,
    recipesById: new Map(derived.map((r) => [r.id, r])),
  };
}

const INCLUDE_DRAFTS = __DEV__ || process.env.EXPO_PUBLIC_INCLUDE_DRAFTS === 'true';

/**
 * Builds the catalog with the bundled recipes plus the user's own. Screens get
 * this through `useCatalog()` (in `@/catalog/live`), which keeps it current.
 */
export function buildAppCatalog(user?: UserContent): Catalog {
  return buildCatalog(ingredientSources, recipeSources, INCLUDE_DRAFTS, user);
}

/**
 * The bundled catalog only. Screens should use `useCatalog()` instead so they
 * include the user's recipes; this is for tests and code that runs outside React.
 */
export const catalog = buildAppCatalog();

export function getRecipe(id: string): Recipe | undefined {
  return catalog.recipesById.get(id);
}

export function getIngredient(id: string): Ingredient {
  const ingredient = catalog.ingredients.get(id);
  if (!ingredient) throw new Error(`Unknown ingredient "${id}"`);
  return ingredient;
}

/** A catalog with id lookups, as screens use it. */
export type LiveCatalog = Catalog & {
  getRecipe: (id: string) => Recipe | undefined;
  getIngredient: (id: string) => Ingredient;
};

export function withLookups(catalog: Catalog): LiveCatalog {
  return {
    ...catalog,
    getRecipe: (id) => catalog.recipesById.get(id),
    getIngredient: (id) => {
      const ingredient = catalog.ingredients.get(id);
      if (!ingredient) throw new Error(`Unknown ingredient "${id}"`);
      return ingredient;
    },
  };
}
