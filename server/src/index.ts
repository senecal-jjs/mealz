import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';

import { appleStore } from './apple.ts';
import { createApp } from './app.ts';
import { AttestStore } from './attest.ts';
import { authFromEnv } from './auth.ts';
import { Ledger } from './credit.ts';
import { ScanCounter } from './limits.ts';
import { readRecipe, type ModelConfig } from './recipe.ts';

const env = process.env;
const number = (value: string | undefined, fallback: number) => (value ? Number(value) : fallback);

const auth = authFromEnv(env);
if (!auth) {
  console.error(
    'No Claude API credentials: set ANTHROPIC_API_KEY, or ANTHROPIC_FEDERATION_RULE_ID, ' +
      'ANTHROPIC_ORGANIZATION_ID and ANTHROPIC_SERVICE_ACCOUNT_ID for workload identity federation.',
  );
  process.exit(1);
}

const config: ModelConfig = {
  model: env.MODEL ?? 'claude-opus-5-5',
  effort: (env.EFFORT as ModelConfig['effort']) ?? 'low',
};
const client = new Anthropic({ ...auth.options, timeout: 90_000, maxRetries: 1 });
const dbPath = env.DB_PATH ?? './scans.db';
const counter = new ScanCounter(dbPath);
counter.prune();
setInterval(() => counter.prune(), 86_400_000).unref();

// App Attest is on when the app ID is set; ATTEST_REQUIRED=false still serves
// unsigned scans (the simulator can't attest).
const appId = env.APPLE_APP_ID;
const attest = appId
  ? { store: new AttestStore(dbPath), appId, required: env.ATTEST_REQUIRED !== 'false' }
  : null;
if (attest) setInterval(() => attest.store.prune(), 600_000).unref();

// Scan credit is on when SCAN_PRICE_CENTS is above 0. Purchases are checked
// for the app's bundle ID (from APPLE_APP_ID); production ones also need its
// numeric App Store ID.
const ledger = new Ledger(dbPath);
ledger.prune();
setInterval(() => ledger.prune(), 86_400_000).unref();
const bundleId = appId?.slice(appId.indexOf('.') + 1);
const credit = {
  pricing: {
    priceCents: number(env.SCAN_PRICE_CENTS, 0),
    freePerMonth: number(env.FREE_SCANS_PER_MONTH, 3),
  },
  ledger,
  apple: bundleId
    ? appleStore({ bundleId, appAppleId: number(env.APPLE_APP_STORE_ID, 0) || undefined })
    : null,
};

const app = createApp({
  read: (input) => readRecipe(client, input, config),
  counter,
  limits: {
    perInstall: number(env.DAILY_LIMIT_PER_INSTALL, 30),
    total: number(env.DAILY_LIMIT_TOTAL, 2000),
  },
  enabled: () => env.SCAN_ENABLED !== 'false',
  attest,
  credit,
  share: { appId, appStoreUrl: env.APP_STORE_URL },
});

const port = number(env.PORT, 8080);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () =>
  console.log(
    JSON.stringify({
      started: true,
      port,
      auth: auth.method,
      attest: attest ? (attest.required ? 'required' : 'optional') : 'off',
      priceCents: credit.pricing.priceCents,
      model: config.model,
      effort: config.effort,
    }),
  ),
);
