/** In-memory stand-in for the favourites hooks, for screen tests. */
import { useSyncExternalStore } from 'react';

let ids: string[] = [];
const listeners = new Set<() => void>();

function set(next: string[]) {
  ids = next;
  listeners.forEach((l) => l());
}

export function resetMockFavourites(initial: string[] = []) {
  set(initial);
}

export function useFavourites(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ids,
  );
}

export const favouriteActions = {
  set: jest.fn(async (recipeId: string, favourite: boolean) =>
    set(
      favourite
        ? [recipeId, ...ids.filter((i) => i !== recipeId)]
        : ids.filter((i) => i !== recipeId),
    ),
  ),
};
