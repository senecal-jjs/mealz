/**
 * The wallet scan credit is kept against: a random UUID, kept in the iPhone's
 * keychain and saved to the user's iCloud (key-value storage), so it comes
 * back on a reinstall or a new iPhone signed in to the same Apple ID. Its
 * "recovery code" is the same UUID, for moving it by hand. Whoever has it can
 * spend the credit.
 */
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { iCloudKeyValue } from '../../../modules/icloud-kv';
import { ICLOUD_WALLET_PREFIX, parseRecoveryCode, walletsFromICloud } from './credit';

const KEY = 'mealz.scanWallet';

/** Saves a wallet in iCloud under its own key; one already there keeps its date. */
function saveToICloud(wallet: string) {
  const key = ICLOUD_WALLET_PREFIX + wallet;
  if (!iCloudKeyValue.getString(key)) iCloudKeyValue.setString(key, new Date().toISOString());
}

/** Every wallet saved in this Apple ID's iCloud, oldest first. */
export const iCloudWallets = () => walletsFromICloud(iCloudKeyValue.entries(ICLOUD_WALLET_PREFIX));

/**
 * This phone's wallet ID. The first time, it's the oldest wallet in iCloud
 * (from a previous install or another iPhone), or a new one.
 */
export async function getWallet(): Promise<string> {
  const saved = await SecureStore.getItemAsync(KEY);
  if (saved && parseRecoveryCode(saved)) {
    saveToICloud(saved);
    return saved;
  }
  const wallet = iCloudWallets()[0] ?? randomUUID().toLowerCase();
  await SecureStore.setItemAsync(KEY, wallet);
  saveToICloud(wallet);
  return wallet;
}

/** Switches this phone to another wallet, from its recovery code or iCloud. */
export async function setWallet(wallet: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, wallet);
  saveToICloud(wallet);
}

/** Whether the wallet can be backed up: the user is signed in to iCloud. */
export const isWalletInICloud = () => iCloudKeyValue.isSignedIn();
