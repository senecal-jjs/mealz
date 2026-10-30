/**
 * The HTTP API. `POST /v1/scan` takes the photographed pages of a recipe and
 * returns it structured; any error tells the app to use its on-device reader.
 * Photos and recipe text are never stored or logged. With pricing on, scans
 * are paid for from credit bought in the app (see credit.ts). It also serves
 * the page behind recipe share links (see share.ts).
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { PurchaseError, toPackPurchase, type AppleStore } from './apple.ts';
import { AttestError, verifyAssertion, verifyAttestation, type AttestStore } from './attest.ts';
import { WALLET_PATTERN, type Charge, type Ledger, type Pricing } from './credit.ts';
import type { Limits, ScanCounter } from './limits.ts';
import { UnreadableError, type ReadResult, type ScanInput } from './recipe.ts';
import { shareRoutes, type ShareOptions } from './share.ts';

export const MAX_PAGES = 4;
/** Each page arrives as base64 JPEG, about 1.33 times its file size. */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const InstallId = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);
const Wallet = z.string().regex(WALLET_PATTERN);

const ScanRequest = z.object({
  installId: InstallId,
  /** Pays for the scan once the month's free scans are used. */
  wallet: Wallet.optional(),
  pages: z
    .array(
      z.object({
        data: z.base64().max(2_500_000),
        mediaType: z.enum(['image/jpeg', 'image/png']),
      }),
    )
    .min(1)
    .max(MAX_PAGES),
  text: z.string().max(20_000),
  /** App Attest: the scan's challenge, signed with the install's attested key. */
  attest: z
    .object({
      keyId: z.base64().length(44),
      challenge: z.string().max(100),
      assertion: z.base64().max(4_000),
    })
    .optional(),
});

const CreditRequest = z.object({
  installId: InstallId,
  /** The attested key free scans are counted by, once the install has one. */
  keyId: z.base64().length(44).optional(),
  wallet: Wallet.optional(),
});

const AttestRequest = z.object({
  keyId: z.base64().length(44),
  challenge: z.string().max(100),
  attestation: z.base64().max(20_000),
});

export type Deps = {
  read: (input: ScanInput) => Promise<ReadResult>;
  counter: ScanCounter;
  limits: Limits;
  /** The kill switch: false sends every app to its on-device reader. */
  enabled: () => boolean;
  /** App Attest; null turns it off (local development). */
  attest?: {
    store: AttestStore;
    /** `<Team ID>.<bundle ID>` */
    appId: string;
    /** When false, unsigned scans are still served (for the simulator). */
    required: boolean;
    roots?: string[];
  } | null;
  /** Scan credit: the price and the ledger it's paid from. */
  credit?: {
    pricing: Pricing;
    ledger: Ledger;
    /** Verifies App Store purchases; null until the server knows the app's bundle ID. */
    apple: AppleStore | null;
  } | null;
  /** Recipe share links: the web page and Apple's app-site association. */
  share?: ShareOptions;
  log?: (entry: Record<string, unknown>) => void;
};

const defaultLog = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry));

export function createApp(deps: Deps) {
  const log = deps.log ?? defaultLog;
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/', shareRoutes(deps.share ?? {}));

  const attest = deps.attest ?? null;
  if (attest) {
    app.post('/v1/attest/challenge', (c) => {
      const challenge = attest.store.newChallenge();
      if (!challenge) {
        log({ route: 'challenge', status: 429, outcome: 'too_many' });
        return c.json({ error: 'limit' }, 429);
      }
      return c.json({ challenge });
    });

    app.post(
      '/v1/attest',
      bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }),
      async (c) => {
        const done = (status: number, outcome: string, extra: Record<string, unknown> = {}) =>
          log({ route: 'attest', status, outcome, ...extra });
        const body = AttestRequest.safeParse(await c.req.json().catch(() => null));
        if (!body.success) {
          done(400, 'bad_request');
          return c.json({ error: 'bad_request' }, 400);
        }
        const { keyId, challenge, attestation } = body.data;
        if (!attest.store.takeChallenge(challenge)) {
          done(401, 'challenge');
          return c.json({ error: 'attestation' }, 401);
        }
        try {
          const key = verifyAttestation(attestation, keyId, challenge, attest);
          attest.store.saveKey(keyId, key);
          done(200, 'ok', { environment: key.environment });
          return c.json({ ok: true });
        } catch (e) {
          done(401, e instanceof AttestError ? e.message : 'error');
          return c.json({ error: 'attestation' }, 401);
        }
      },
    );
  }

  const credit = deps.credit?.pricing.priceCents ? deps.credit : null;

  // The app asks before a scan, to say what it will cost, and shows the balance.
  app.post('/v1/credit', async (c) => {
    if (!credit) return c.json({ priceCents: 0, freeScansLeft: 0, balanceCents: 0 });
    const body = CreditRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'bad_request' }, 400);
    const { installId, keyId, wallet } = body.data;
    const payer = keyId ? `key:${keyId}` : installId;
    return c.json(credit.ledger.summary(payer, wallet ?? null, credit.pricing));
  });

  // The app sends each credit pack purchase here before finishing it with
  // StoreKit; resending one is harmless.
  app.post(
    '/v1/credit/apple',
    bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }),
    async (c) => {
      const done = (status: number, outcome: string, extra: Record<string, unknown> = {}) =>
        log({ route: 'purchase', status, outcome, ...extra });
      if (!credit?.apple) {
        done(503, 'disabled');
        return c.json({ error: 'disabled' }, 503);
      }
      const body = z
        .object({ transaction: z.string().max(20_000) })
        .safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        done(400, 'bad_request');
        return c.json({ error: 'bad_request' }, 400);
      }
      try {
        const pack = toPackPurchase(await credit.apple.transaction(body.data.transaction));
        const added = credit.ledger.add(
          pack.wallet,
          pack.cents,
          'purchase',
          `apple:${pack.transactionId}`,
        );
        done(200, added ? 'credited' : 'repeat', {
          cents: pack.cents,
          environment: pack.environment,
        });
        return c.json({ balanceCents: credit.ledger.balance(pack.wallet) });
      } catch (e) {
        done(400, e instanceof PurchaseError ? e.message : 'error');
        return c.json({ error: 'invalid' }, 400);
      }
    },
  );

  // App Store Server Notifications (version 2), set in App Store Connect.
  // A refunded pack takes its credit back, even if that leaves the balance
  // below zero.
  app.post(
    '/v1/store/apple/notifications',
    bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }),
    async (c) => {
      const done = (status: number, outcome: string, extra: Record<string, unknown> = {}) =>
        log({ route: 'notification', status, outcome, ...extra });
      if (!credit?.apple) {
        done(503, 'disabled');
        return c.json({ error: 'disabled' }, 503);
      }
      const body = z
        .object({ signedPayload: z.string().max(60_000) })
        .safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        done(400, 'bad_request');
        return c.json({ error: 'bad_request' }, 400);
      }
      try {
        const notification = await credit.apple.notification(body.data.signedPayload);
        const signed = notification.data?.signedTransactionInfo;
        const type = notification.notificationType;
        if (type !== 'REFUND' || !signed) {
          done(200, 'ignored', { type });
          return c.json({ ok: true });
        }
        const pack = toPackPurchase(await credit.apple.transaction(signed), { refunded: true });
        const added = credit.ledger.add(
          pack.wallet,
          -pack.cents,
          'refund',
          `apple-refund:${pack.transactionId}`,
        );
        done(200, added ? 'refunded' : 'repeat', { cents: pack.cents });
        return c.json({ ok: true });
      } catch (e) {
        // Apple retries until it gets a 200, so only refuse what can't be read.
        if (e instanceof PurchaseError && !e.message.startsWith('signature')) {
          done(200, `ignored_${e.message}`);
          return c.json({ ok: true });
        }
        done(400, e instanceof PurchaseError ? 'signature' : 'error');
        return c.json({ error: 'invalid' }, 400);
      }
    },
  );

  app.post(
    '/v1/scan',
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: 'too_large' }, 413) }),
    async (c) => {
      const started = Date.now();
      const done = (status: number, outcome: string, extra: Record<string, unknown> = {}) =>
        log({ route: 'scan', status, outcome, ms: Date.now() - started, ...extra });

      if (!deps.enabled()) {
        done(503, 'disabled');
        return c.json({ error: 'disabled' }, 503);
      }
      const body = ScanRequest.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        done(400, 'bad_request');
        return c.json({ error: 'bad_request' }, 400);
      }
      const { installId, wallet, pages, text } = body.data;

      // With App Attest, limits count by attested key: an install ID can be made up.
      let counted = installId;
      if (attest && body.data.attest) {
        const { keyId, challenge, assertion } = body.data.attest;
        const key = attest.store.getKey(keyId);
        if (!key) {
          done(401, 'unknown_key');
          return c.json({ error: 'unknown_key' }, 401);
        }
        if (!attest.store.takeChallenge(challenge)) {
          done(401, 'challenge');
          return c.json({ error: 'attestation' }, 401);
        }
        try {
          attest.store.setCounter(keyId, verifyAssertion(assertion, challenge, key, attest.appId));
        } catch (e) {
          done(401, e instanceof AttestError ? e.message : 'error');
          return c.json({ error: 'attestation' }, 401);
        }
        counted = `key:${keyId}`;
      } else if (attest?.required) {
        done(401, 'unsigned');
        return c.json({ error: 'attestation' }, 401);
      }

      const allowed = deps.counter.take(counted, deps.limits);
      if (allowed !== 'ok') {
        done(429, `limit_${allowed}`);
        return c.json({ error: 'limit' }, 429);
      }

      let charge: Charge | null = null;
      if (credit) {
        const charged = credit.ledger.charge(counted, wallet ?? null, credit.pricing);
        if (charged === 'no_credit') {
          done(402, 'no_credit');
          return c.json(
            {
              error: 'no_credit',
              credit: credit.ledger.summary(counted, wallet ?? null, credit.pricing),
            },
            402,
          );
        }
        charge = charged;
      }

      try {
        const { recipe, usage } = await deps.read({ pages, text });
        done(200, 'ok', {
          pages: pages.length,
          signed: counted !== installId,
          ...(charge ? { paid: charge.kind } : {}),
          ...usage,
        });
        if (!credit) return c.json({ recipe });
        return c.json({
          recipe,
          credit: credit.ledger.summary(counted, wallet ?? null, credit.pricing),
        });
      } catch (e) {
        if (charge) credit?.ledger.release(charge);
        const reason = e instanceof UnreadableError ? e.message : 'model_error';
        done(502, reason, e instanceof UnreadableError ? {} : { error: String(e) });
        return c.json({ error: 'unreadable' }, 502);
      }
    },
  );

  return app;
}
