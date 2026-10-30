import { SCAN_SERVER_URL } from '@/features/my-recipes/cloud';
import { ensureInstallId } from '@/features/my-recipes/read-scan';
import type { Preferences } from '@/features/preferences/preferences';

import { fetchCredit, type CreditSummary } from './credit';
import { useCredit } from './store';
import { getWallet } from './wallet';

/** Asks the server for the price, free scans left and this phone's balance. */
export async function refreshCredit(prefs: Preferences): Promise<CreditSummary | null> {
  if (!SCAN_SERVER_URL) return null;
  const summary = await fetchCredit(SCAN_SERVER_URL, {
    installId: await ensureInstallId(prefs),
    keyId: prefs.attestKeyId,
    wallet: await getWallet(),
  });
  useCredit.getState().setSummary(summary);
  return summary;
}
