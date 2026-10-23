/**
 * Reads and writes the meal plan. Functions take the database as an argument
 * so tests can run them against an in-memory SQLite database.
 *
 * The plan holds at most one active (not yet cooked) item per recipe, like
 * Mealime: adding a recipe that's already planned does nothing.
 */
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { planItems } from '@/db/schema';
import type { Db } from '@/db/types';
import { MAX_SERVINGS, MIN_SERVINGS } from '@/domain/quantity';
import { clearCheckedLines } from '@/features/grocery/grocery';

export type { Db };

export type PlanItem = typeof planItems.$inferSelect;

/** Used until onboarding (M5) lets people pick their household size. */
export const DEFAULT_SERVINGS = 2;

const isActive = isNull(planItems.cookedAt);

function clampServings(servings: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(servings)));
}

/** Cooked plan items, most recent first. */
export function historyQuery(db: Db) {
  return db
    .select()
    .from(planItems)
    .where(isNotNull(planItems.cookedAt))
    .orderBy(desc(planItems.cookedAt));
}

/** Active plan items, oldest first. */
export function activePlanQuery(db: Db) {
  return db.select().from(planItems).where(isActive).orderBy(asc(planItems.addedAt));
}

export async function addToPlan(db: Db, recipeId: string, servings = DEFAULT_SERVINGS) {
  const existing = await db
    .select({ id: planItems.id })
    .from(planItems)
    .where(and(eq(planItems.recipeId, recipeId), isActive));
  if (existing.length > 0) return;

  await db.insert(planItems).values({
    id: newId(),
    recipeId,
    servings: clampServings(servings),
    addedAt: new Date(),
  });
}

export async function removeFromPlan(db: Db, recipeId: string) {
  await db.delete(planItems).where(and(eq(planItems.recipeId, recipeId), isActive));
}

export async function setPlanServings(db: Db, recipeId: string, servings: number) {
  await db
    .update(planItems)
    .set({ servings: clampServings(servings) })
    .where(and(eq(planItems.recipeId, recipeId), isActive));
}

/**
 * Finishes a planned recipe: it leaves the plan and stays in the table as
 * history, with an optional 1–5 rating.
 */
export async function markCooked(db: Db, recipeId: string, rating?: number) {
  const stars = rating === undefined ? null : Math.min(5, Math.max(1, Math.round(rating)));
  await db
    .update(planItems)
    .set({ cookedAt: new Date(), rating: stars })
    .where(and(eq(planItems.recipeId, recipeId), isActive));
}

/** Starts a fresh plan, which also unchecks the grocery list it produced. */
export async function clearPlan(db: Db) {
  await db.delete(planItems).where(isActive);
  await clearCheckedLines(db);
}
