/**
 * Buying credit packs with StoreKit (through expo-iap). A purchase is only
 * finished with StoreKit once the server has added it to the wallet; until
 * then iOS hands it back on every launch, so a purchase made while offline,
 * or interrupted by the app closing, is added later rather than lost.
 */
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type Purchase,
} from 'expo-iap';
import { useEffect } from 'react';
import { create } from 'zustand';

import { SCAN_SERVER_URL } from '@/features/my-recipes/cloud';

import { PACK_IDS, redeemPurchase, RedeemError } from './credit';
import { useCredit } from './store';
import { getWallet } from './wallet';

/** The pack being bought, and what went wrong with the last purchase. */
export const usePurchase = create<{ buying: string | null; error: string | null }>(() => ({
  buying: null,
  error: null,
}));

const log = (...args: unknown[]) => {
  if (__DEV__) console.log('[credit]', ...args);
};

let connection: Promise<boolean> | null = null;

/** Connects to the App Store once; a failed attempt is retried next time. */
function connect(): Promise<boolean> {
  connection ??= initConnection().catch(() => {
    connection = null;
    return false;
  });
  return connection;
}

const redeeming = new Set<string>();

/** Adds a pack purchase to its wallet on the server, then finishes it with StoreKit. */
async function redeem(purchase: Purchase) {
  const token = purchase.purchaseToken;
  if (!SCAN_SERVER_URL || !PACK_IDS.includes(purchase.productId) || !token) return;
  // Ask to Buy: nothing to add until a parent approves it.
  if (purchase.purchaseState === 'pending') {
    usePurchase.setState({ buying: null, error: null });
    return;
  }
  if (redeeming.has(purchase.id)) return;
  redeeming.add(purchase.id);
  try {
    const balanceCents = await redeemPurchase(SCAN_SERVER_URL, token);
    await finishTransaction({ purchase, isConsumable: true });
    useCredit.getState().setBalance(balanceCents);
    usePurchase.setState({ buying: null, error: null });
    log('added', purchase.productId);
  } catch (e) {
    log('not added yet', String(e));
    usePurchase.setState({
      buying: null,
      error:
        e instanceof RedeemError && e.reason === 'rejected'
          ? 'Mealz couldn’t confirm this purchase. It will try again next time you open the app.'
          : 'Your purchase went through, but Mealz couldn’t reach its server to add the credit. It will be added next time you open the app.',
    });
  } finally {
    redeeming.delete(purchase.id);
  }
}

/** Adds any purchases StoreKit is still holding (bought but not yet added). */
export async function addPendingPurchases() {
  if (!(await connect())) return;
  const purchases = await getAvailablePurchases().catch(() => []);
  await Promise.all(purchases.map(redeem));
}

/**
 * Listens for purchases for as long as the app runs. Mounted once, near the
 * root, so purchases that finish while the app was closed still get added.
 */
export function usePurchaseListener(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const updated = purchaseUpdatedListener((purchase) => void redeem(purchase));
    const failed = purchaseErrorListener((error) =>
      usePurchase.setState({
        buying: null,
        error: isUserCancelledError(error) ? null : error.message,
      }),
    );
    void addPendingPurchases();
    return () => {
      updated.remove();
      failed.remove();
    };
  }, [enabled]);
}

/** The packs as the App Store sells them, with prices in the user's currency, cheapest first. */
export async function loadPacks(): Promise<Product[]> {
  if (!(await connect())) return [];
  const products = (await fetchProducts({ skus: [...PACK_IDS], type: 'in-app' })) ?? [];
  return (products as Product[]).sort((a, b) => PACK_IDS.indexOf(a.id) - PACK_IDS.indexOf(b.id));
}

/** Starts buying a pack. The outcome arrives through the purchase listener. */
export async function buyPack(productId: string) {
  usePurchase.setState({ buying: productId, error: null });
  try {
    await requestPurchase({
      request: { apple: { sku: productId, appAccountToken: await getWallet() } },
      type: 'in-app',
    });
  } catch (e) {
    usePurchase.setState({ buying: null, error: isUserCancelledError(e) ? null : String(e) });
  }
}
