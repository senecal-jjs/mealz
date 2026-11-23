import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { lineSignature, type GroceryLine } from '@/domain/grocery';
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
  /** Checked generated lines: ingredient id → what the line asked for when checked. */
  checkedLines: Map<string, string>;
  customItems: CustomItem[];
};

/** The stored part of the grocery list, re-rendering whenever it changes. */
export function useGroceryState(): GroceryState {
  const checked = useLiveQuery(checkedLinesQuery(db)).data;
  const customItems = useLiveQuery(customItemsQuery(db)).data;
  const checkedLines = useMemo(
    () =>
      new Map(
        checked.flatMap((r) =>
          r.ingredientId && r.checkedFor ? [[r.ingredientId, r.checkedFor] as const] : [],
        ),
      ),
    [checked],
  );
  return { checkedLines, customItems };
}

export const groceryActions = {
  /** Checks a line off for what it asks for now, or unchecks it. */
  setLineChecked: (line: GroceryLine, checked: boolean) =>
    setLineChecked(db, line.key, checked ? lineSignature(line) : null),
  addCustom: (name: string) => addCustomItem(db, name),
  setCustomChecked: (id: string, checked: boolean) => setCustomChecked(db, id, checked),
  removeCustom: (id: string) => removeCustomItem(db, id),
};
