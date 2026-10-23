/**
 * Stores what the grocery list can't recompute: which generated lines are
 * checked off, and the user's own custom items.
 *
 * Generated lines themselves are never stored; they are rebuilt from the plan
 * on every render (`compileGroceryList`). A check is saved per ingredient id,
 * so it survives the plan changing, and is cleared with the plan.
 */
import { and, asc, eq } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { groceryItems } from '@/db/schema';
import type { Db } from '@/db/types';

export type CustomItem = typeof groceryItems.$inferSelect;

const isGenerated = eq(groceryItems.source, 'generated');
const isCustom = eq(groceryItems.source, 'custom');

/** Ingredient ids of generated lines that are checked off. */
export function checkedLinesQuery(db: Db) {
  return db
    .select()
    .from(groceryItems)
    .where(and(isGenerated, eq(groceryItems.checked, true)));
}

export function customItemsQuery(db: Db) {
  return db.select().from(groceryItems).where(isCustom).orderBy(asc(groceryItems.createdAt));
}

export async function setLineChecked(db: Db, ingredientId: string, checked: boolean) {
  await db
    .delete(groceryItems)
    .where(and(isGenerated, eq(groceryItems.ingredientId, ingredientId)));
  if (!checked) return;
  await db.insert(groceryItems).values({
    id: newId(),
    ingredientId,
    checked: true,
    source: 'generated',
    createdAt: new Date(),
  });
}

export async function clearCheckedLines(db: Db) {
  await db.delete(groceryItems).where(isGenerated);
}

export async function addCustomItem(db: Db, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.insert(groceryItems).values({
    id: newId(),
    customName: trimmed,
    checked: false,
    source: 'custom',
    createdAt: new Date(),
  });
}

export async function setCustomChecked(db: Db, id: string, checked: boolean) {
  await db
    .update(groceryItems)
    .set({ checked })
    .where(and(isCustom, eq(groceryItems.id, id)));
}

export async function removeCustomItem(db: Db, id: string) {
  await db.delete(groceryItems).where(and(isCustom, eq(groceryItems.id, id)));
}
