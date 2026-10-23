/**
 * Reads and writes the meal plan. Functions take the database as an argument
 * so tests can run them against an in-memory SQLite database.
 *
 * The plan holds at most one active (not yet cooked) item per recipe, like
 * Mealime: adding a recipe that's already planned does nothing.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';
import { planItems } from '@/db/schema';
import { MAX_SERVINGS, MIN_SERVINGS } from '@/domain/quantity';

// Accepts both the app's sync expo-sqlite database and the async one tests use.
export type Db = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

export type PlanItem = typeof planItems.$inferSelect;

/** Used until onboarding (M5) lets people pick their household size. */
export const DEFAULT_SERVINGS = 2;

const isActive = isNull(planItems.cookedAt);

function clampServings(servings: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(servings)));
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

export async function clearPlan(db: Db) {
  await db.delete(planItems).where(isActive);
}
