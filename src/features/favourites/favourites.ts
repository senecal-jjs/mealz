import { desc, eq } from 'drizzle-orm';

import { favourites } from '@/db/schema';
import type { Db } from '@/db/types';

/** Favourited recipes, most recently saved first. */
export function favouritesQuery(db: Db) {
  return db.select().from(favourites).orderBy(desc(favourites.savedAt));
}

export async function setFavourite(db: Db, recipeId: string, favourite: boolean) {
  if (favourite) {
    await db.insert(favourites).values({ recipeId, savedAt: new Date() }).onConflictDoNothing();
  } else {
    await db.delete(favourites).where(eq(favourites.recipeId, recipeId));
  }
}
