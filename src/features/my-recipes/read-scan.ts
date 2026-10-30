import { useCredit } from '@/features/credit/store';
import { getWallet } from '@/features/credit/wallet';
import { preferenceActions } from '@/features/preferences/hooks';
import type { Preferences } from '@/features/preferences/preferences';

import { createAppAttest } from './app-attest';
import {
  CloudScanError,
  newInstallId,
  readWithCloud,
  SCAN_SERVER_URL,
  type CloudRecipe,
  type ScannedPage,
} from './cloud';

/** This install's random ID (made and saved the first time); the server counts free scans by it. */
export async function ensureInstallId(prefs: Preferences): Promise<string> {
  if (prefs.installId) return prefs.installId;
  const installId = newInstallId();
  await preferenceActions.save({ installId });
  return installId;
}

/**
 * Reads scanned pages with Claude on the scan server: signed with App Attest
 * and paid for from this phone's wallet. Keeps the credit shown up to date
 * with what the server reports. Throws `CloudScanError` on any failure.
 */
export async function readScan(pages: ScannedPage[], prefs: Preferences): Promise<CloudRecipe> {
  if (!SCAN_SERVER_URL) throw new CloudScanError('disabled');
  const installId = await ensureInstallId(prefs);
  let attestKeyId = prefs.attestKeyId;
  const attest = createAppAttest(
    SCAN_SERVER_URL,
    {
      get: () => attestKeyId,
      set: async (keyId) => {
        attestKeyId = keyId;
        await preferenceActions.save({ attestKeyId: keyId });
      },
    },
    { log: __DEV__ ? console.log : undefined },
  );
  try {
    const result = await readWithCloud(pages, installId, { attest, wallet: await getWallet() });
    if (result.credit) useCredit.getState().setSummary(result.credit);
    return result;
  } catch (e) {
    if (e instanceof CloudScanError && e.credit) useCredit.getState().setSummary(e.credit);
    throw e;
  }
}
