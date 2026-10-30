/**
 * Scan credit: people buy credit packs in the app, and each recipe the Mealz
 * server reads costs a fixed price after a few free scans a month. The balance
 * is kept by the server, against a wallet ID stored on this phone (see
 * wallet.ts). See server/src/credit.ts for the other side.
 */

/** The packs on sale, by App Store product ID, and the credit each adds. */
export const PACKS = [
  { productId: 'com.bitcli.mealz.credit.199', cents: 199 },
  { productId: 'com.bitcli.mealz.credit.499', cents: 499 },
  { productId: 'com.bitcli.mealz.credit.999', cents: 999 },
] as const;

export const PACK_IDS: readonly string[] = PACKS.map((p) => p.productId);

/** Price 0 means scans are free and there's nothing to buy. */
export type CreditSummary = { priceCents: number; freeScansLeft: number; balanceCents: number };

/** Who's asking: free scans count per install, credit per wallet. */
export type CreditOwner = { installId: string; keyId: string | null; wallet: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A typed or pasted recovery code as a wallet ID, or null if it isn't one. */
export function parseRecoveryCode(text: string): string | null {
  const code = text.trim().toLowerCase();
  return UUID.test(code) ? code : null;
}

export function isCreditSummary(v: unknown): v is CreditSummary {
  const s = v as CreditSummary | null;
  return (
    !!s &&
    Number.isInteger(s.priceCents) &&
    Number.isInteger(s.freeScansLeft) &&
    Number.isInteger(s.balanceCents)
  );
}

/** "$4.99", "-$0.10". Credit is always in US dollars, whatever the App Store charged. */
export function formatCents(cents: number): string {
  const dollars = `$${(Math.abs(cents) / 100).toFixed(2)}`;
  return cents < 0 ? `-${dollars}` : dollars;
}

export const canAffordScan = (s: CreditSummary) =>
  s.priceCents === 0 || s.freeScansLeft > 0 || s.balanceCents >= s.priceCents;

/** What the next scan will cost, in a line; null when scans are free. */
export function scanCostNote(s: CreditSummary): string | null {
  if (s.priceCents === 0) return null;
  if (s.freeScansLeft > 0) {
    return s.freeScansLeft === 1
      ? 'This scan uses your last free scan this month.'
      : `This scan is free. ${s.freeScansLeft} free scans left this month.`;
  }
  if (s.balanceCents >= s.priceCents) {
    return `This scan costs ${formatCents(s.priceCents)} of your ${formatCents(s.balanceCents)} credit.`;
  }
  return 'You’re out of scan credit.';
}

const post = (fetchFn: typeof fetch, url: string, body: unknown) =>
  fetchFn(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/** The price, free scans left and balance. Throws when the server can't be reached. */
export async function fetchCredit(
  url: string,
  { installId, keyId, wallet }: CreditOwner,
  fetchFn: typeof fetch = fetch,
): Promise<CreditSummary> {
  const res = await post(fetchFn, `${url}/v1/credit`, {
    installId,
    keyId: keyId ?? undefined,
    wallet: wallet ?? undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !isCreditSummary(json)) throw new Error(`credit ${res.status}`);
  return json;
}

/** Why a purchase wasn't added: `rejected` won't change on a retry; `unreachable` might. */
export class RedeemError extends Error {
  constructor(readonly reason: 'rejected' | 'unreachable') {
    super(`Purchase not added: ${reason}`);
  }
}

/**
 * Sends a credit pack purchase (StoreKit's signed transaction) to the server,
 * which adds it to the wallet it was bought for. Safe to repeat.
 */
export async function redeemPurchase(
  url: string,
  signedTransaction: string,
  fetchFn: typeof fetch = fetch,
): Promise<number> {
  let res: Response;
  try {
    res = await post(fetchFn, `${url}/v1/credit/apple`, { transaction: signedTransaction });
  } catch {
    throw new RedeemError('unreachable');
  }
  const json = (await res.json().catch(() => null)) as { balanceCents?: unknown } | null;
  if (res.status === 400) throw new RedeemError('rejected');
  if (!res.ok || typeof json?.balanceCents !== 'number') throw new RedeemError('unreachable');
  return json.balanceCents;
}
