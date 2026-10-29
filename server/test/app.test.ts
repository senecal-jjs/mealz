import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp, type Deps } from '../src/app.ts';
import { ScanCounter } from '../src/limits.ts';
import { UnreadableError, type ScannedRecipe } from '../src/recipe.ts';

const recipe: ScannedRecipe = {
  title: 'Toast',
  description: null,
  servings: null,
  prepMinutes: null,
  cookMinutes: null,
  ingredients: ['1 slice bread'],
  steps: ['Toast the bread.'],
  notes: [],
};

function setup(overrides: Partial<Deps> = {}) {
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    read: async () => ({ recipe, usage: { inputTokens: 1, outputTokens: 1 } }),
    counter: new ScanCounter(':memory:'),
    limits: { perInstall: 2, total: 100 },
    enabled: () => true,
    log: (entry) => logs.push(entry),
    ...overrides,
  });
  return { app, logs };
}

const body = (extra: object = {}) => ({
  installId: 'install-0123456789abcdef',
  pages: [{ data: 'aGVsbG8=', mediaType: 'image/jpeg' }],
  text: 'Toast\n1 slice bread',
  ...extra,
});

const post = (app: ReturnType<typeof createApp>, json: unknown) =>
  app.request('/v1/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });

test('returns the recipe and logs no content', async () => {
  const { app, logs } = setup();
  const res = await post(app, body());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { recipe });
  assert.equal(logs.length, 1);
  assert.doesNotMatch(JSON.stringify(logs), /Toast|bread|aGVsbG8/);
});

test('rejects malformed requests', async () => {
  const { app } = setup();
  assert.equal((await post(app, body({ installId: 'x' }))).status, 400);
  assert.equal((await post(app, body({ pages: [] }))).status, 400);
  assert.equal((await post(app, body({ pages: Array(5).fill(body().pages[0]) }))).status, 400);
  assert.equal((await post(app, 'not json')).status, 400);
});

test('enforces the daily limit', async () => {
  const { app } = setup();
  assert.equal((await post(app, body())).status, 200);
  assert.equal((await post(app, body())).status, 200);
  assert.equal((await post(app, body())).status, 429);
});

test('reports unreadable pages and model errors as 502', async () => {
  for (const error of [new UnreadableError('refused'), new Error('overloaded')]) {
    const { app } = setup({ read: async () => Promise.reject(error) });
    const res = await post(app, body());
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'unreadable' });
  }
});

test('the kill switch turns scanning off', async () => {
  const { app } = setup({ enabled: () => false });
  assert.equal((await post(app, body())).status, 503);
});
