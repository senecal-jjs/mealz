/**
 * Daily scan limits, per install and in total, counted in SQLite. One machine
 * is enough at this scale; with several, move the counts to shared storage.
 */
import type { DatabaseSync } from 'node:sqlite';

import { openDb } from './db.ts';

export type Limits = { perInstall: number; total: number };

export class ScanCounter {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = openDb(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        day TEXT NOT NULL,
        install TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (day, install)
      )`);
  }

  /**
   * Counts a scan if both limits allow it. Returns which limit was hit
   * instead, without counting.
   */
  take(install: string, limits: Limits, now = new Date()): 'ok' | 'install' | 'total' {
    const day = now.toISOString().slice(0, 10);
    const mine = this.db
      .prepare('SELECT count FROM scans WHERE day = ? AND install = ?')
      .get(day, install) as { count: number } | undefined;
    if ((mine?.count ?? 0) >= limits.perInstall) return 'install';
    const all = this.db.prepare('SELECT SUM(count) AS total FROM scans WHERE day = ?').get(day) as {
      total: number | null;
    };
    if ((all.total ?? 0) >= limits.total) return 'total';
    this.db
      .prepare(
        `INSERT INTO scans (day, install, count) VALUES (?, ?, 1)
         ON CONFLICT (day, install) DO UPDATE SET count = count + 1`,
      )
      .run(day, install);
    return 'ok';
  }

  /** Drops counts older than a week; called once a day is plenty. */
  prune(now = new Date()) {
    const cutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    this.db.prepare('DELETE FROM scans WHERE day < ?').run(cutoff);
  }
}
