import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

// The change listener lets `useLiveQuery` re-render screens when rows change.
const sqlite = openDatabaseSync('mealz.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
