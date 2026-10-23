import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import {
  preferencesQuery,
  resetAllData,
  savePreferences,
  withDefaults,
  type Preferences,
  type PreferencesUpdate,
} from '@/features/preferences/preferences';

/**
 * The user's preferences. `loaded` is false until the first read finishes, so
 * the app doesn't flash onboarding at someone who already did it.
 */
export function usePreferences(): { prefs: Preferences; loaded: boolean } {
  const { data, updatedAt } = useLiveQuery(preferencesQuery(db));
  return { prefs: withDefaults(data), loaded: updatedAt !== undefined };
}

export const preferenceActions = {
  save: (update: PreferencesUpdate) => savePreferences(db, update),
  finishOnboarding: () => savePreferences(db, { onboardedAt: new Date() }),
  resetAll: () => resetAllData(db),
};
