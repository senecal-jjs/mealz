/**
 * "Build Me a Plan": picks a varied set of recipes for the week. Only recipes
 * that fit the user's preferences are considered (the caller filters them),
 * nothing is picked twice, and two meals in a row don't share a main protein
 * when that can be avoided. Favourites and well-rated recipes come up a bit
 * more often, and ones cooked in the last two weeks less.
 */
import type { Ingredient, IngredientKind, Recipe } from '@/catalog/types';

export const MIN_MEALS = 1;
export const MAX_MEALS = 14;
export const DEFAULT_MEALS = 5;

const RECENT_DAYS = 14;
const PROTEIN_KINDS: IngredientKind[] = ['meat', 'poultry', 'fish', 'shellfish', 'egg'];

/** A cooked meal from the user's history. */
export type CookedMeal = { recipeId: string; cookedAt: Date | null; rating: number | null };

export type PlanContext = {
  ingredients: Map<string, Ingredient>;
  favourites: Set<string>;
  history: CookedMeal[];
  now: Date;
};

/** What a recipe is built around: its first meat, poultry, fish, shellfish or egg ingredient, else "plant". */
export function mainProtein(recipe: Recipe, ingredients: Map<string, Ingredient>): string {
  for (const item of recipe.ingredients) {
    const kind = ingredients.get(item.ingredient)?.kind;
    if (kind && PROTEIN_KINDS.includes(kind)) return kind;
  }
  return 'plant';
}

/** How likely a recipe is to be picked, relative to an ordinary one (1). */
export function pickWeight(recipe: Recipe, context: PlanContext): number {
  let weight = 1;
  if (context.favourites.has(recipe.id)) weight *= 2;
  const cooked = context.history.filter((h) => h.recipeId === recipe.id);
  const ratings = cooked.map((h) => h.rating).filter((r): r is number => r !== null);
  if (ratings.length && ratings.reduce((a, b) => a + b, 0) / ratings.length >= 4) weight *= 1.5;
  const recent = context.now.getTime() - RECENT_DAYS * 86_400_000;
  if (cooked.some((h) => h.cookedAt && h.cookedAt.getTime() >= recent)) weight *= 0.25;
  return weight;
}

/** One recipe from `pool`, more likely the heavier it is. */
function pickWeighted(pool: Recipe[], context: PlanContext, random: () => number): Recipe {
  const weights = pool.map((r) => pickWeight(r, context));
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Picks up to `meals` recipes from `candidates`, leaving out `exclude` (e.g.
 * ones already in the plan). Returns fewer when not enough fit.
 */
export function buildPlan(
  candidates: Recipe[],
  meals: number,
  context: PlanContext,
  exclude: Set<string> = new Set(),
  random: () => number = Math.random,
): Recipe[] {
  let pool = candidates.filter((r) => !exclude.has(r.id));
  const picks: Recipe[] = [];
  while (picks.length < meals && pool.length) {
    const last = picks.at(-1);
    const lastProtein = last ? mainProtein(last, context.ingredients) : null;
    const varied = pool.filter((r) => mainProtein(r, context.ingredients) !== lastProtein);
    const pick = pickWeighted(varied.length ? varied : pool, context, random);
    picks.push(pick);
    pool = pool.filter((r) => r.id !== pick.id);
  }
  return picks;
}

/**
 * Another recipe for the pick at `index`: not already picked or excluded, and
 * if possible not sharing a main protein with its neighbours. Null when no
 * other recipe fits.
 */
export function swapPick(
  candidates: Recipe[],
  picks: Recipe[],
  index: number,
  context: PlanContext,
  exclude: Set<string> = new Set(),
  random: () => number = Math.random,
): Recipe | null {
  const taken = new Set([...exclude, ...picks.map((r) => r.id)]);
  const pool = candidates.filter((r) => !taken.has(r.id));
  if (!pool.length) return null;
  const neighbours = [picks[index - 1], picks[index + 1]]
    .filter((r): r is Recipe => !!r)
    .map((r) => mainProtein(r, context.ingredients));
  const varied = pool.filter((r) => !neighbours.includes(mainProtein(r, context.ingredients)));
  return pickWeighted(varied.length ? varied : pool, context, random);
}
