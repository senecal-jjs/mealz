import type { Diet, Ingredient, Recipe } from '@/catalog/types';
import { DIET_LABELS } from '@/catalog/types';

export const QUICK_MINUTES = 30;
const ONE_PAN_TAGS = ['one-pot', 'sheet-pan'];

export type BrowseFilter =
  'all' | 'mine' | 'favourites' | 'quick' | 'one-pan' | 'kid-friendly' | 'high-carb' | Diet;

export const BROWSE_FILTERS: { id: BrowseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My recipes' },
  { id: 'favourites', label: '♥ Favourites' },
  { id: 'quick', label: `Under ${QUICK_MINUTES} min` },
  { id: 'one-pan', label: 'One pan' },
  { id: 'kid-friendly', label: 'Kid-friendly' },
  // Fuel for endurance training: pasta, rice, potatoes and noodles. Tagged by hand,
  // unlike the low-carb diet, which is worked out from the ingredients.
  { id: 'high-carb', label: 'High-carb' },
  ...(Object.keys(DIET_LABELS) as Diet[]).map((d) => ({ id: d, label: DIET_LABELS[d] })),
];

export function matchesFilter(
  recipe: Recipe,
  filter: BrowseFilter,
  favourites: Set<string>,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'mine') return recipe.mine;
  if (filter === 'favourites') return favourites.has(recipe.id);
  if (filter === 'quick') return recipe.totalMinutes <= QUICK_MINUTES;
  if (filter === 'one-pan') return ONE_PAN_TAGS.some((t) => recipe.tags.includes(t));
  if (filter === 'kid-friendly') return recipe.tags.includes('kid-friendly');
  if (filter === 'high-carb') return recipe.tags.includes('high-carb');
  return recipe.diets.includes(filter);
}

/** Case-insensitive match on the title or any ingredient name ("salmon", "tacos"). */
function matchesQuery(
  recipe: Recipe,
  query: string,
  ingredients: Map<string, Ingredient>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (recipe.title.toLowerCase().includes(q)) return true;
  return recipe.ingredients.some((item) =>
    ingredients.get(item.ingredient)?.name.toLowerCase().includes(q),
  );
}

export function browseRecipes(
  recipes: Recipe[],
  ingredients: Map<string, Ingredient>,
  filter: BrowseFilter,
  query: string,
  favourites: Set<string> = new Set(),
): Recipe[] {
  return recipes.filter(
    (r) => matchesFilter(r, filter, favourites) && matchesQuery(r, query, ingredients),
  );
}

/** Today as "2026-10-30", in the phone's time zone. */
export function localDay(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** FNV-1a: a small, fast hash, so each recipe gets a stable spot for the day. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The recipes in a shuffled order that stays the same all day and changes the
 * next, so browsing turns up different recipes without the list jumping around
 * between visits.
 */
export function dailyOrder<T extends { id: string }>(recipes: T[], day: string): T[] {
  return recipes
    .map((recipe) => ({ recipe, key: hash(`${day}:${recipe.id}`) }))
    .sort((a, b) => a.key - b.key || a.recipe.id.localeCompare(b.recipe.id))
    .map(({ recipe }) => recipe);
}
