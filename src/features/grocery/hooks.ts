import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import {
  addCustomItem,
  checkedLinesQuery,
  customItemsQuery,
  removeCustomItem,
  setCustomChecked,
  setLineChecked,
  type CustomItem,
} from '@/features/grocery/grocery';

export type GroceryState = {
  /** Ingredient ids of generated lines that are checked off. */
  checkedKeys: Set<string>;
  customItems: CustomItem[];
};

/** The stored part of the grocery list, re-rendering whenever it changes. */
export function useGroceryState(): GroceryState {
  const checked = useLiveQuery(checkedLinesQuery(db)).data;
  const customItems = useLiveQuery(customItemsQuery(db)).data;
  const checkedKeys = useMemo(
    () => new Set(checked.flatMap((r) => (r.ingredientId ? [r.ingredientId] : []))),
    [checked],
  );
  return { checkedKeys, customItems };
}

export const groceryActions = {
  setLineChecked: (ingredientId: string, checked: boolean) =>
    setLineChecked(db, ingredientId, checked),
  addCustom: (name: string) => addCustomItem(db, name),
  setCustomChecked: (id: string, checked: boolean) => setCustomChecked(db, id, checked),
  removeCustom: (id: string) => removeCustomItem(db, id),
};
