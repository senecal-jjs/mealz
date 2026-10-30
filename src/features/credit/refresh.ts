import { SCAN_SERVER_URL } from '@/features/my-recipes/cloud';
import { ensureInstallId } from '@/features/my-recipes/read-scan';
import type { Preferences } from '@/features/preferences/preferences';

import { fetchCredit, type CreditOwner, type CreditSummary } from './credit';
import { useCredit } from './store';
import { getWallet, iCloudWallets, setWallet } from './wallet';

/** Enough for anyone's real history of phones; each one costs a request. */
const MAX_ICLOUD_WALLETS = 5;

/**
 * Asks the server for the price, free scans left and this phone's balance.
 *
 * An empty wallet may just be one this phone made before iCloud had synced
 * (a fresh install, or a new iPhone). If iCloud lists another wallet with
 * credit, the phone switches to it.
 */
export async function refreshCredit(prefs: Preferences): Promise<CreditSummary | null> {
  if (!SCAN_SERVER_URL) return null;
  const url = SCAN_SERVER_URL;
  const owner: Omit<CreditOwner, 'wallet'> = {
    installId: await ensureInstallId(prefs),
    keyId: prefs.attestKeyId,
  };
  const wallet = await getWallet();
  let summary = await fetchCredit(url, { ...owner, wallet });

  if (summary.priceCents > 0 && summary.balanceCents === 0) {
    const others = iCloudWallets()
      .filter((w) => w !== wallet)
      .slice(0, MAX_ICLOUD_WALLETS);
    for (const other of others) {
      const theirs = await fetchCredit(url, { ...owner, wallet: other }).catch(() => null);
      if (theirs && theirs.balanceCents > summary.balanceCents) {
        await setWallet(other);
        summary = theirs;
      }
    }
  }

  useCredit.getState().setSummary(summary);
  return summary;
}
