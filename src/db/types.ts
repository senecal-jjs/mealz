import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from '@/db/schema';

/** Accepts both the app's sync expo-sqlite database and the async one tests use. */
export type Db = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;
