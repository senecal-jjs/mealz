import { useMemo } from 'react';

import { catalog, getRecipe } from '@/catalog';
import { compileGroceryList, type GroceryLine, type PlannedRecipe } from '@/domain/grocery';
import { useGroceryState, type GroceryState } from '@/features/grocery/hooks';
import { usePlan } from '@/features/plan/hooks';

/** The grocery list for the current plan, plus what's checked and the custom items. */
export function useGroceryList(): GroceryState & { lines: GroceryLine[] } {
  const plan = usePlan();
  const state = useGroceryState();

  const lines = useMemo(() => {
    const planned: PlannedRecipe[] = plan.flatMap((item) => {
      const recipe = getRecipe(item.recipeId);
      return recipe ? [{ recipe, servings: item.servings }] : [];
    });
    return compileGroceryList(planned, catalog.ingredients);
  }, [plan]);

  return { lines, ...state };
}
