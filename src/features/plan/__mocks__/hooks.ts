/**
 * In-memory stand-in for the plan hooks, used by screen tests with
 * `jest.mock('@/features/plan/hooks')` (expo-sqlite's live queries need the
 * native module). The real data functions are tested against SQLite in
 * `plan.test.ts`.
 */
import { useMemo, useSyncExternalStore } from 'react';

import { DEFAULT_SERVINGS, type PlanItem } from '@/features/plan/plan';

let items: PlanItem[] = [];
const listeners = new Set<() => void>();

function set(next: PlanItem[]) {
  items = next;
  listeners.forEach((l) => l());
}

export function resetMockPlan() {
  set([]);
}

export function usePlan(): PlanItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
  );
}

export function usePlannedServings(): Map<string, number> {
  const plan = usePlan();
  return useMemo(() => new Map(plan.map((i) => [i.recipeId, i.servings])), [plan]);
}

export const planActions = {
  add: jest.fn(async (recipeId: string, servings = DEFAULT_SERVINGS) => {
    if (items.some((i) => i.recipeId === recipeId)) return;
    set([
      ...items,
      { id: recipeId, recipeId, servings, addedAt: new Date(), cookedAt: null, rating: null },
    ]);
  }),
  remove: jest.fn(async (recipeId: string) => set(items.filter((i) => i.recipeId !== recipeId))),
  setServings: jest.fn(async (recipeId: string, servings: number) =>
    set(items.map((i) => (i.recipeId === recipeId ? { ...i, servings } : i))),
  ),
  clear: jest.fn(async () => set([])),
  markCooked: jest.fn(async (recipeId: string, _rating?: number) =>
    set(items.filter((i) => i.recipeId !== recipeId)),
  ),
};
