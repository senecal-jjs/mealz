import type { Diet, Ingredient, Recipe } from '@/catalog/types';
import { DIET_LABELS } from '@/catalog/types';

export const QUICK_MINUTES = 30;

export type BrowseFilter = 'all' | 'quick' | Diet;

export const BROWSE_FILTERS: { id: BrowseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'quick', label: `Under ${QUICK_MINUTES} min` },
  ...(Object.keys(DIET_LABELS) as Diet[]).map((d) => ({ id: d, label: DIET_LABELS[d] })),
];

function matchesFilter(recipe: Recipe, filter: BrowseFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'quick') return recipe.totalMinutes <= QUICK_MINUTES;
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
): Recipe[] {
  return recipes.filter((r) => matchesFilter(r, filter) && matchesQuery(r, query, ingredients));
}
