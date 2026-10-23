import { useMemo } from 'react';

import { useCatalog } from '@/catalog/live';
import { compileGroceryList, type GroceryLine, type PlannedRecipe } from '@/domain/grocery';
import { useGroceryState, type GroceryState } from '@/features/grocery/hooks';
import { usePlan } from '@/features/plan/hooks';
import { usePreferences } from '@/features/preferences/hooks';

/** The grocery list for the current plan, plus what's checked and the custom items. */
export function useGroceryList(): GroceryState & { lines: GroceryLine[] } {
  const plan = usePlan();
  const catalog = useCatalog();
  const state = useGroceryState();
  const { units } = usePreferences().prefs;

  const lines = useMemo(() => {
    const planned: PlannedRecipe[] = plan.flatMap((item) => {
      const recipe = catalog.getRecipe(item.recipeId);
      return recipe ? [{ recipe, servings: item.servings }] : [];
    });
    return compileGroceryList(planned, catalog.ingredients, units);
  }, [plan, catalog, units]);

  return { lines, ...state };
}
