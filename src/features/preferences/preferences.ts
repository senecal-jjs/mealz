/**
 * The user's onboarding choices, stored as a single row (id = 1). Reading
 * before onboarding returns the defaults with `onboardedAt: null`.
 */
import { eq } from 'drizzle-orm';

import { favourites, groceryItems, planItems, preferences } from '@/db/schema';
import type { Db } from '@/db/types';

export type Preferences = typeof preferences.$inferSelect;
export type PreferencesUpdate = Partial<Omit<Preferences, 'id'>>;

const ROW_ID = 1;

export const DEFAULT_PREFERENCES: Preferences = {
  id: ROW_ID,
  diet: null,
  allergies: [],
  dislikedIngredientIds: [],
  defaultServings: 2,
  units: 'us',
  onboardedAt: null,
};

export function preferencesQuery(db: Db) {
  return db.select().from(preferences).where(eq(preferences.id, ROW_ID));
}

/** The stored row, or the defaults when there isn't one yet. */
export function withDefaults(rows: Preferences[]): Preferences {
  return rows[0] ?? DEFAULT_PREFERENCES;
}

export async function savePreferences(db: Db, update: PreferencesUpdate) {
  await db
    .insert(preferences)
    .values({ ...DEFAULT_PREFERENCES, ...update, id: ROW_ID })
    .onConflictDoUpdate({ target: preferences.id, set: update });
}

/** Wipes everything on the device. Onboarding runs again afterwards. */
export async function resetAllData(db: Db) {
  await db.delete(planItems);
  await db.delete(groceryItems);
  await db.delete(favourites);
  await db.delete(preferences);
}
