/**
 * An in-memory SQLite database for tests, using Node's built-in `node:sqlite`
 * behind Drizzle's proxy driver and the app's real migrations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/sqlite-proxy';

import * as schema from '@/db/schema';

export function createTestDb() {
  const sqlite = new DatabaseSync(':memory:');

  const migrationsDir = path.join(__dirname, '../../drizzle');
  for (const file of fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) sqlite.exec(statement);
  }

  return drizzle(
    async (sql, params, method) => {
      const statement = sqlite.prepare(sql);
      if (method === 'run') {
        statement.run(...params);
        return { rows: [] };
      }
      statement.setReturnArrays(true);
      if (method === 'get') return { rows: (statement.get(...params) ?? []) as unknown[] };
      return { rows: statement.all(...params) as unknown[] };
    },
    { schema },
  );
}
