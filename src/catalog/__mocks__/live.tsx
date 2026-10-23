/**
 * In-memory stand-in for the live catalog, used by screen tests with
 * `jest.mock('@/catalog/live')` (the real one reads SQLite). Starts with the
 * bundled recipes; tests add user recipes with `setMockUserContent`.
 */
import { useSyncExternalStore } from 'react';

import { buildAppCatalog, withLookups, type LiveCatalog, type UserContent } from '@/catalog';

let current: LiveCatalog = withLookups(buildAppCatalog());
const listeners = new Set<() => void>();

export function setMockUserContent(user: UserContent) {
  current = withLookups(buildAppCatalog(user));
  listeners.forEach((l) => l());
}

export function resetMockCatalog() {
  setMockUserContent({ recipes: [], ingredients: [] });
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useCatalog(): LiveCatalog {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
