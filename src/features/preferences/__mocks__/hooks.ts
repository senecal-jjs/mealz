/**
 * In-memory stand-in for the preferences hooks, used by screen tests with
 * `jest.mock('@/features/preferences/hooks')`. The real storage functions are
 * tested against SQLite in `preferences.test.ts`.
 */
import { useSyncExternalStore } from 'react';

import {
  DEFAULT_PREFERENCES,
  type Preferences,
  type PreferencesUpdate,
} from '@/features/preferences/preferences';

let prefs: Preferences = DEFAULT_PREFERENCES;
const listeners = new Set<() => void>();

function set(next: Preferences) {
  prefs = next;
  listeners.forEach((l) => l());
}

export function resetMockPreferences(initial: PreferencesUpdate = {}) {
  set({ ...DEFAULT_PREFERENCES, ...initial });
}

export function usePreferences() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => prefs,
  );
  return { prefs: current, loaded: true };
}

export const preferenceActions = {
  save: jest.fn(async (update: PreferencesUpdate) => set({ ...prefs, ...update })),
  finishOnboarding: jest.fn(async () => set({ ...prefs, onboardedAt: new Date() })),
  resetAll: jest.fn(async () => set(DEFAULT_PREFERENCES)),
};
