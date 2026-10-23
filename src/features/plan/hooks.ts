import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import {
  activePlanQuery,
  addToPlan,
  clearPlan,
  historyQuery,
  markCooked,
  removeFromPlan,
  setPlanServings,
  type PlanItem,
} from '@/features/plan/plan';

/** The active plan, re-rendering whenever it changes. */
export function usePlan(): PlanItem[] {
  return useLiveQuery(activePlanQuery(db)).data;
}

/** Cooked recipes, most recent first. */
export function useHistory(): PlanItem[] {
  return useLiveQuery(historyQuery(db)).data;
}

/** Servings per planned recipe id, for "is this in my plan?" checks. */
export function usePlannedServings(): Map<string, number> {
  const plan = usePlan();
  return useMemo(() => new Map(plan.map((i) => [i.recipeId, i.servings])), [plan]);
}

export const planActions = {
  add: (recipeId: string, servings?: number) => addToPlan(db, recipeId, servings),
  remove: (recipeId: string) => removeFromPlan(db, recipeId),
  setServings: (recipeId: string, servings: number) => setPlanServings(db, recipeId, servings),
  clear: () => clearPlan(db),
  markCooked: (recipeId: string, rating?: number) => markCooked(db, recipeId, rating),
};
