/**
 * The wallet scan credit is kept against: a random UUID, made on first use and
 * kept in the iPhone's keychain, which usually survives deleting the app
 * (Apple doesn't promise it). Its "recovery code" is the same UUID, so it can
 * be moved to another phone. Whoever has it can spend the credit.
 */
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { parseRecoveryCode } from './credit';

const KEY = 'mealz.scanWallet';

/** This phone's wallet ID, making one the first time. */
export async function getWallet(): Promise<string> {
  const saved = await SecureStore.getItemAsync(KEY);
  if (saved && parseRecoveryCode(saved)) return saved;
  const wallet = randomUUID().toLowerCase();
  await SecureStore.setItemAsync(KEY, wallet);
  return wallet;
}

/** Switches this phone to another wallet, from its recovery code. */
export async function setWallet(wallet: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, wallet);
}
