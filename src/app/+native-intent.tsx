/**
 * Rewrites incoming links before Expo Router routes them. A recipe share link
 * (`https://<share host>/r#<data>`) opens the import screen with its data.
 * This must never throw: an error here would crash the app on launch.
 */
import { SHARE_PATH, shareDataFromUrl } from '@/features/sharing/share-link';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    // The path part of a full URL ("https://host/r#…") or of a bare path ("/r#…").
    const pathname = /^(?:[a-z][a-z0-9+.-]*:\/\/[^/?#]*)?([^?#]*)/i.exec(path)?.[1] ?? '';
    if (pathname.replace(/\/$/, '') !== SHARE_PATH) return path;
    const data = shareDataFromUrl(path);
    return data ? `/import-recipe?d=${data}` : '/import-recipe';
  } catch {
    return path;
  }
}
