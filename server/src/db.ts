/**
 * Opens the server's SQLite file the way Litestream needs it: WAL journaling,
 * and a busy timeout so writes wait out Litestream's brief checkpoint locks
 * instead of failing.
 */
import { DatabaseSync } from 'node:sqlite';

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;`);
  return db;
}
