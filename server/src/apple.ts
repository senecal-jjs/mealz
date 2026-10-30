/**
 * Checks App Store purchases and notifications with Apple's library. Each is
 * a JWS signed by Apple; the library verifies its certificate chain up to
 * Apple's root and that it's for this app.
 *
 * Purchases made in TestFlight, in App Review and with sandbox accounts are
 * signed for the sandbox environment, so both environments are accepted.
 */
import {
  Environment,
  SignedDataVerifier,
  Type,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

import { PACKS, WALLET_PATTERN } from './credit.ts';

/** https://www.apple.com/certificateauthority/AppleRootCA-G3.cer (SHA-256 63:34:3A:BF:…:91:79) */
export const APPLE_ROOT_CA_G3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

export class PurchaseError extends Error {}

/** A verified credit pack purchase: which wallet it's for and how much it adds. */
export type PackPurchase = {
  transactionId: string;
  wallet: string;
  cents: number;
  environment: string;
};

export type AppleStore = {
  /** Verifies a signed transaction (a JWS from StoreKit or a notification). */
  transaction(signed: string): Promise<JWSTransactionDecodedPayload>;
  /** Verifies an App Store Server Notification (version 2). */
  notification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload>;
};

export type AppleStoreOptions = {
  bundleId: string;
  /** The app's numeric App Store ID; production purchases can't be checked without it. */
  appAppleId?: number;
};

/**
 * Reads a verified transaction as a credit pack purchase. Throws
 * `PurchaseError` for anything else, and for a refunded purchase unless
 * `refunded` says that's what's wanted.
 */
export function toPackPurchase(
  tx: JWSTransactionDecodedPayload,
  { refunded = false } = {},
): PackPurchase {
  const cents = tx.productId ? PACKS[tx.productId] : undefined;
  const wallet = tx.appAccountToken?.toLowerCase();
  if (tx.type !== Type.CONSUMABLE || cents === undefined) throw new PurchaseError('product');
  if (!wallet || !WALLET_PATTERN.test(wallet)) throw new PurchaseError('wallet');
  if (!tx.transactionId) throw new PurchaseError('transaction');
  if (!refunded && tx.revocationDate) throw new PurchaseError('revoked');
  return {
    transactionId: tx.transactionId,
    wallet,
    cents: cents * (tx.quantity ?? 1),
    environment: String(tx.environment),
  };
}

export function appleStore({ bundleId, appAppleId }: AppleStoreOptions): AppleStore {
  const roots = [Buffer.from(APPLE_ROOT_CA_G3)];
  const verifiers = [
    ...(appAppleId
      ? [new SignedDataVerifier(roots, true, Environment.PRODUCTION, bundleId, appAppleId)]
      : []),
    new SignedDataVerifier(roots, true, Environment.SANDBOX, bundleId),
  ];

  /** Tries each environment in turn; throws the last failure if none accepts it. */
  async function verify<T>(check: (v: SignedDataVerifier) => Promise<T>): Promise<T> {
    let failure: unknown;
    for (const verifier of verifiers) {
      try {
        return await check(verifier);
      } catch (e) {
        failure = e;
      }
    }
    throw new PurchaseError(`signature: ${String(failure)}`);
  }

  return {
    transaction: (signed) => verify((v) => v.verifyAndDecodeTransaction(signed)),
    notification: (signedPayload) => verify((v) => v.verifyAndDecodeNotification(signedPayload)),
  };
}
