import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { createContext, useContext } from 'react';

import { db } from '@/db/client';
import {
  DEFAULT_PREFERENCES,
  preferencesQuery,
  resetAllData,
  savePreferences,
  withDefaults,
  type Preferences,
  type PreferencesUpdate,
} from '@/features/preferences/preferences';

type PreferencesState = { prefs: Preferences; loaded: boolean };

const PreferencesContext = createContext<PreferencesState>({
  prefs: DEFAULT_PREFERENCES,
  loaded: false,
});

/**
 * Loads preferences once for the whole app. A live query per screen would
 * start empty and briefly report the defaults, which screens that seed state
 * from preferences (like the recipe page's servings) would capture.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { data, updatedAt } = useLiveQuery(preferencesQuery(db));
  const value = { prefs: withDefaults(data), loaded: updatedAt !== undefined };
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/** The user's preferences. `loaded` is false until the first read finishes. */
export function usePreferences(): PreferencesState {
  return useContext(PreferencesContext);
}

export const preferenceActions = {
  save: (update: PreferencesUpdate) => savePreferences(db, update),
  finishOnboarding: () => savePreferences(db, { onboardedAt: new Date() }),
  resetAll: () => resetAllData(db),
};
