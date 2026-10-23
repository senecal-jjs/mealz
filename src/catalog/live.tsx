import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { createContext, useContext, useMemo } from 'react';

import {
  buildAppCatalog,
  catalog as bundledCatalog,
  withLookups,
  type LiveCatalog,
} from '@/catalog';
import { db } from '@/db/client';
import { customIngredientsQuery, userRecipesQuery } from '@/features/my-recipes/my-recipes';

// Without a provider (e.g. a screen rendered on its own in a test) screens see
// the bundled recipes only.
const CatalogContext = createContext<LiveCatalog>(withLookups(bundledCatalog));

/** Keeps the catalog in sync with the user's recipes as they're added, edited or deleted. */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const recipes = useLiveQuery(userRecipesQuery(db)).data;
  const ingredients = useLiveQuery(customIngredientsQuery(db)).data;
  const value = useMemo(
    () =>
      withLookups(
        buildAppCatalog({
          recipes: recipes.map((r) => r.data),
          ingredients: ingredients.map((i) => i.data),
        }),
      ),
    [recipes, ingredients],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

/** Bundled recipes plus the user's own, with id lookups. */
export function useCatalog(): LiveCatalog {
  return useContext(CatalogContext);
}
