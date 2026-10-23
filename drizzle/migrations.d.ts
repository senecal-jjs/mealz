// Types for the drizzle-kit generated migrations bundle.
import type { MigrationConfig } from 'drizzle-orm/migrator';

declare const migrations: {
  journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
  migrations: Record<string, string>;
};
export default migrations;
export type { MigrationConfig };
