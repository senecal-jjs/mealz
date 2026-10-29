/**
 * The HTTP API. `POST /v1/scan` takes the photographed pages of a recipe and
 * returns it structured; any error tells the app to use its on-device reader.
 * Photos and recipe text are never stored or logged.
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import type { Limits, ScanCounter } from './limits.ts';
import { UnreadableError, type ReadResult, type ScanInput } from './recipe.ts';

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
});

export type Deps = {
  read: (input: ScanInput) => Promise<ReadResult>;
  counter: ScanCounter;
  limits: Limits;
  /** The kill switch: false sends every app to its on-device reader. */
  enabled: () => boolean;
  log?: (entry: Record<string, unknown>) => void;
};

const defaultLog = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry));

export function createApp(deps: Deps) {
  const log = deps.log ?? defaultLog;
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true }));

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

      const allowed = deps.counter.take(installId, deps.limits);
      if (allowed !== 'ok') {
        done(429, `limit_${allowed}`);
        return c.json({ error: 'limit' }, 429);
      }

      try {
        const { recipe, usage } = await deps.read({ pages, text });
        done(200, 'ok', { pages: pages.length, ...usage });
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
