/**
 * Cloud scanning: sends a recipe's photographed pages, and the text read from
 * them on the phone, to the Mealz scan server, which reads them with Claude.
 * Only used when the user has allowed it; any failure falls back to the
 * on-device reader. The server keeps nothing.
 */
import type { ParsedRecipeText, TextLine } from '@/domain/recipe-text';

import { encodeJpeg } from '../../../modules/text-recognition';
import type { AppAttest } from './app-attest';

export type ScannedPage = { uri: string; lines: TextLine[] };

/** Set per build in eas.json (and in the environment for local development). */
export const SCAN_SERVER_URL = process.env.EXPO_PUBLIC_SCAN_SERVER_URL || null;

export const isCloudScanConfigured = () => SCAN_SERVER_URL !== null;

/** Long enough for a slow model answer on a multi-page recipe, short enough not to strand the user. */
const TIMEOUT_MS = 45_000;
/** Larger photos cost more to upload and read without reading any better. */
const MAX_EDGE = 1568;

export type CloudScanFailure =
  'offline' | 'timeout' | 'limit' | 'disabled' | 'unreadable' | 'attestation' | 'server';

export class CloudScanError extends Error {
  constructor(readonly reason: CloudScanFailure) {
    super(`Cloud scan failed: ${reason}`);
  }
}

export type CloudRecipe = { recipe: ParsedRecipeText; notes: string[] };

/** A random ID for this install; the server counts scans by it for the daily limit. */
export function newInstallId(): string {
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

/** Shrinks a page photo to a sensible size and encodes it as JPEG. */
export async function preparePage(uri: string): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  return { data: await encodeJpeg(uri, MAX_EDGE, 0.7), mediaType: 'image/jpeg' };
}

const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const positiveOrNull = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;

/** Checks the server's answer and turns it into the app's parsed-recipe shape. */
export function toCloudRecipe(json: unknown): CloudRecipe {
  const r = (json as { recipe?: Record<string, unknown> } | null)?.recipe;
  if (
    !r ||
    typeof r.title !== 'string' ||
    !isStrings(r.ingredients) ||
    !isStrings(r.steps) ||
    r.ingredients.length === 0 ||
    r.steps.length === 0
  ) {
    throw new CloudScanError('unreadable');
  }
  return {
    recipe: {
      title: r.title.trim(),
      description: typeof r.description === 'string' ? r.description.trim() : '',
      servings: positiveOrNull(r.servings),
      prepMinutes: positiveOrNull(r.prepMinutes),
      cookMinutes: positiveOrNull(r.cookMinutes),
      ingredients: r.ingredients.map((s) => s.trim()).filter(Boolean),
      steps: r.steps.map((s) => s.trim()).filter(Boolean),
    },
    notes: isStrings(r.notes) ? r.notes : [],
  };
}

const FAILURE_BY_STATUS: Record<number, CloudScanFailure> = {
  429: 'limit',
  503: 'disabled',
  502: 'unreadable',
  401: 'attestation',
};

type Options = {
  url?: string | null;
  fetchFn?: typeof fetch;
  prepare?: typeof preparePage;
  /** Signs each scan with App Attest; null sends it unsigned. */
  attest?: AppAttest | null;
};

/** Reads the pages with the scan server. Throws `CloudScanError` on any failure. */
export async function readWithCloud(
  pages: ScannedPage[],
  installId: string,
  { url = SCAN_SERVER_URL, fetchFn = fetch, prepare = preparePage, attest = null }: Options = {},
): Promise<CloudRecipe> {
  if (!url) throw new CloudScanError('disabled');
  const images = await Promise.all(pages.map((p) => prepare(p.uri)));
  const text = pages
    .map((p) => p.lines.map((l) => l.text).join('\n'))
    .join('\n\n--- next page ---\n\n');

  const send = async () => {
    const signature = attest ? await attest.sign() : null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetchFn(`${url}/v1/scan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ installId, pages: images, text, attest: signature ?? undefined }),
        signal: controller.signal,
      });
    } catch {
      throw new CloudScanError(controller.signal.aborted ? 'timeout' : 'offline');
    } finally {
      clearTimeout(timer);
    }
  };

  let response = await send();
  if (response.status === 401 && attest) {
    const { error } = ((await response.json().catch(() => null)) ?? {}) as { error?: string };
    if (error === 'unknown_key') {
      // The server lost this install's key: attest a new one and try once more.
      await attest.forget();
      response = await send();
    }
  }
  if (!response.ok) throw new CloudScanError(FAILURE_BY_STATUS[response.status] ?? 'server');
  return toCloudRecipe(await response.json().catch(() => null));
}
