/**
 * The HTTP API. `POST /v1/scan` takes the photographed pages of a recipe and
 * returns it structured; any error tells the app to use its on-device reader.
 * Photos and recipe text are never stored or logged. It also serves the page
 * behind recipe share links (see share.ts).
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { AttestError, verifyAssertion, verifyAttestation, type AttestStore } from './attest.ts';
import type { Limits, ScanCounter } from './limits.ts';
import { UnreadableError, type ReadResult, type ScanInput } from './recipe.ts';
import { shareRoutes, type ShareOptions } from './share.ts';

export const MAX_PAGES = 4;
/** Each page arrives as base64 JPEG, about 1.33 times its file size. */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const ScanRequest = z.object({
  installId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
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
      const { installId, pages, text } = body.data;

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

      try {
        const { recipe, usage } = await deps.read({ pages, text });
        done(200, 'ok', { pages: pages.length, signed: counted !== installId, ...usage });
        return c.json({ recipe });
      } catch (e) {
        const reason = e instanceof UnreadableError ? e.message : 'model_error';
        done(502, reason, e instanceof UnreadableError ? {} : { error: String(e) });
        return c.json({ error: 'unreadable' }, 502);
      }
    },
  );

  return app;
}
