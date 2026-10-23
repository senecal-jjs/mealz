import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { favouritesQuery, setFavourite } from '@/features/favourites/favourites';

/** Favourite recipe ids, most recently saved first. */
export function useFavourites(): string[] {
  const rows = useLiveQuery(favouritesQuery(db)).data;
  return useMemo(() => rows.map((r) => r.recipeId), [rows]);
}

export const favouriteActions = {
  set: (recipeId: string, favourite: boolean) => setFavourite(db, recipeId, favourite),
};
