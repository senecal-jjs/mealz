/**
 * Keeps the user's own recipes backed up in their iCloud Drive (see format.ts):
 * each save writes its file, each delete removes it, and on launch anything
 * changed while iCloud was unreachable catches up. On a new install, recipes
 * in the backup that aren't on the phone can be restored.
 *
 * Everything quietly does nothing without iCloud (signed out, iCloud Drive
 * off for Mealz, Android). Mealz's server is never involved.
 */
import { inArray } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';

import type { RecipeSource } from '@/catalog/types';
import { db } from '@/db/client';
import { customIngredients, userRecipes } from '@/db/schema';
import { saveUserRecipe } from '@/features/my-recipes/my-recipes';
import { photoUri } from '@/features/my-recipes/photos';

import { iCloudDrive } from '../../../modules/icloud-drive';
import {
  backedUpIds,
  parseBackup,
  photoPath,
  RECIPES_FOLDER,
  recipePath,
  recipesToRestore,
  toBackup,
} from './format';

/** Each recipe's `updatedAt` (ms) when its backup was last written, so launch knows what's stale. */
const SAVED_KEY = 'backup.saved';
/** Recipes in the backup the user chose not to restore, so they aren't offered again. */
const DECLINED_KEY = 'backup.declined';

const log = (...args: unknown[]) => {
  if (__DEV__) console.log('[backup]', ...args);
};

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(Storage.getItemSync(key) ?? 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
}

const savedVersions = () => readJson<Record<string, number>>(SAVED_KEY, {});
const declined = () => new Set(readJson<string[]>(DECLINED_KEY, []));

function markSaved(id: string, updatedAt: number | null) {
  const saved = savedVersions();
  if (updatedAt === null) delete saved[id];
  else saved[id] = updatedAt;
  Storage.setItemSync(SAVED_KEY, JSON.stringify(saved));
}

/** One backup task at a time, so a quick edit-then-delete can't race. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

let available: Promise<boolean> | null = null;
/** Whether iCloud Drive can be used; asked once per launch. */
export function isBackupAvailable(): Promise<boolean> {
  available ??= (iCloudDrive?.isAvailable() ?? Promise.resolve(false)).catch(() => false);
  return available;
}

async function writeBackup(recipe: RecipeSource, updatedAt: number) {
  const drive = iCloudDrive;
  if (!drive) return;
  const used = recipe.ingredients.map((i) => i.ingredient);
  const custom = used.length
    ? (await db.select().from(customIngredients).where(inArray(customIngredients.id, used))).map(
        (row) => row.data,
      )
    : [];
  const backup = toBackup(recipe, custom);
  if (backup.photo && recipe.image) {
    await drive.copyIn(photoPath(backup.photo), photoUri(recipe.image));
  }
  await drive.writeText(recipePath(recipe.id), JSON.stringify(backup));
  markSaved(recipe.id, updatedAt);
}

/** Backs up a recipe the user just saved, dropping the backup of a photo it no longer uses. */
export function backUpRecipe(recipe: RecipeSource, replacedPhoto: string | null = null) {
  void enqueue(async () => {
    if (!(await isBackupAvailable())) return;
    await writeBackup(recipe, Date.now());
    if (replacedPhoto) await iCloudDrive?.remove(photoPath(replacedPhoto)).catch(() => {});
    log('saved', recipe.id);
  }).catch((e) => log('save failed', String(e)));
}

/** Removes the backup of a recipe the user deleted. */
export function removeBackup(recipe: RecipeSource, photo: string | null) {
  void enqueue(async () => {
    if (!(await isBackupAvailable()) || !iCloudDrive) return;
    await iCloudDrive.remove(recipePath(recipe.id));
    if (photo) await iCloudDrive.remove(photoPath(photo)).catch(() => {});
    markSaved(recipe.id, null);
    log('removed', recipe.id);
  }).catch((e) => log('remove failed', String(e)));
}

/**
 * On launch: backs up every recipe changed since its last backup (all of them
 * the first time), then returns the recipes in the backup that could be
 * restored, leaving out ones the user already declined.
 */
export function syncBackup(): Promise<string[]> {
  return enqueue(async () => {
    if (!(await isBackupAvailable()) || !iCloudDrive) return [];
    const rows = await db.select().from(userRecipes);
    const saved = savedVersions();
    for (const row of rows) {
      const updatedAt = row.updatedAt.getTime();
      if ((saved[row.id] ?? 0) >= updatedAt) continue;
      await writeBackup(row.data, updatedAt).catch((e) =>
        log('catch-up failed', row.id, String(e)),
      );
    }
    const inBackup = backedUpIds(await iCloudDrive.list(RECIPES_FOLDER));
    return recipesToRestore(inBackup, new Set(rows.map((r) => r.id)), declined());
  }).catch((e) => {
    log('sync failed', String(e));
    return [];
  });
}

/** Every recipe in the backup that isn't on this phone, including declined ones. */
export function restorableRecipes(): Promise<string[]> {
  return enqueue(async () => {
    if (!(await isBackupAvailable()) || !iCloudDrive) return [];
    const rows = await db.select({ id: userRecipes.id }).from(userRecipes);
    const inBackup = backedUpIds(await iCloudDrive.list(RECIPES_FOLDER));
    return recipesToRestore(inBackup, new Set(rows.map((r) => r.id)));
  });
}

/** Restores recipes from the backup, with their photos. Returns how many were restored. */
export function restoreRecipes(ids: string[]): Promise<number> {
  return enqueue(async () => {
    const drive = iCloudDrive;
    if (!drive) return 0;
    let restored = 0;
    for (const id of ids) {
      try {
        const backup = parseBackup(await drive.readText(recipePath(id)));
        if (!backup) continue;
        let image: string | null = null;
        if (backup.photo) {
          image = `recipe-photos/${backup.photo}`;
          await drive
            .copyOut(photoPath(backup.photo), new File(Paths.document, image).uri)
            .catch(() => {
              image = null;
            });
        }
        await saveUserRecipe(db, { ...backup.recipe, image }, backup.ingredients);
        // Just restored from the backup, so it's up to date there.
        markSaved(id, Date.now() + 1000);
        restored++;
      } catch (e) {
        log('restore failed', id, String(e));
      }
    }
    return restored;
  });
}

/** Remembers that the user didn't want these recipes restored. */
export function declineRestore(ids: string[]) {
  Storage.setItemSync(DECLINED_KEY, JSON.stringify([...new Set([...declined(), ...ids])]));
}
