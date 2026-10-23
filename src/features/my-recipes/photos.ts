/**
 * Recipe photos live in the app's documents folder. Recipes store a path
 * relative to it ("recipe-photos/abc.jpg"), because iOS can move the app's
 * container between updates and absolute paths would break.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { newId } from '@/db/ids';

const PHOTO_DIR = 'recipe-photos';

function isRelative(image: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(image);
}

/** Copies a picked or captured photo into app storage and returns its stored path. */
export async function savePhoto(sourceUri: string): Promise<string> {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  dir.create({ idempotent: true, intermediates: true });
  const name = `${newId()}.jpg`;
  await new File(sourceUri).copy(new File(dir, name));
  return `${PHOTO_DIR}/${name}`;
}

/** The loadable URI for a recipe's `image` field (bundled URLs pass through). */
export function photoUri(image: string): string {
  return isRelative(image) ? new File(Paths.document, image).uri : image;
}

/** Deletes a stored photo; bundled images and missing files are ignored. */
export function deletePhoto(image: string | null) {
  if (!image || !isRelative(image)) return;
  try {
    const file = new File(Paths.document, image);
    if (file.exists) file.delete();
  } catch {
    // A leftover photo file is harmless.
  }
}
