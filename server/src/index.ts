import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';

import { createApp } from './app.ts';
import { authFromEnv } from './auth.ts';
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
const counter = new ScanCounter(env.DB_PATH ?? './scans.db');
counter.prune();
setInterval(() => counter.prune(), 86_400_000).unref();

const app = createApp({
  read: (input) => readRecipe(client, input, config),
  counter,
  limits: {
    perInstall: number(env.DAILY_LIMIT_PER_INSTALL, 30),
    total: number(env.DAILY_LIMIT_TOTAL, 2000),
  },
  enabled: () => env.SCAN_ENABLED !== 'false',
});

const port = number(env.PORT, 8080);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () =>
  console.log(
    JSON.stringify({
      started: true,
      port,
      auth: auth.method,
      model: config.model,
      effort: config.effort,
    }),
  ),
);
