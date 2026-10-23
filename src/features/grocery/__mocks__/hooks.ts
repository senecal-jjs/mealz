/**
 * In-memory stand-in for the grocery hooks, used by screen tests with
 * `jest.mock('@/features/grocery/hooks')`. The real storage functions are
 * tested against SQLite in `grocery.test.ts`.
 */
import { useSyncExternalStore } from 'react';

import type { CustomItem } from '@/features/grocery/grocery';
import type { GroceryState } from '@/features/grocery/hooks';

let state: GroceryState = { checkedKeys: new Set(), customItems: [] };
const listeners = new Set<() => void>();

function set(next: Partial<GroceryState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function resetMockGrocery() {
  set({ checkedKeys: new Set(), customItems: [] });
}

export function useGroceryState(): GroceryState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

let nextId = 0;

export const groceryActions = {
  setLineChecked: jest.fn(async (ingredientId: string, checked: boolean) => {
    const keys = new Set(state.checkedKeys);
    if (checked) keys.add(ingredientId);
    else keys.delete(ingredientId);
    set({ checkedKeys: keys });
  }),
  addCustom: jest.fn(async (name: string) => {
    const item: CustomItem = {
      id: `custom-${nextId++}`,
      ingredientId: null,
      customName: name.trim(),
      quantity: null,
      unit: null,
      checked: false,
      source: 'custom',
      createdAt: new Date(),
    };
    set({ customItems: [...state.customItems, item] });
  }),
  setCustomChecked: jest.fn(async (id: string, checked: boolean) =>
    set({ customItems: state.customItems.map((i) => (i.id === id ? { ...i, checked } : i)) }),
  ),
  removeCustom: jest.fn(async (id: string) =>
    set({ customItems: state.customItems.filter((i) => i.id !== id) }),
  ),
};
