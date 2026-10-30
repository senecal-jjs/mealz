import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp, type Deps } from '../src/app.ts';
import { PurchaseError, type AppleStore } from '../src/apple.ts';
import { Ledger, type Pricing } from '../src/credit.ts';
import { ScanCounter } from '../src/limits.ts';
import { UnreadableError, type ScannedRecipe } from '../src/recipe.ts';

const pricing: Pricing = { priceCents: 10, freePerMonth: 2 };
const WALLET = '0f8fad5b-d9cb-469f-a165-70867728950e';
const OTHER = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const PACK = 'com.bitcli.mealz.credit.199';

test('free scans come first, then the wallet pays', () => {
  const ledger = new Ledger(':memory:');
  ledger.add(WALLET, 15, 'grant', 'test');
  for (let i = 0; i < 2; i++) {
    const free = ledger.charge('key:a', WALLET, pricing);
    assert.equal(typeof free === 'object' && free.kind, 'free');
  }
  assert.equal(ledger.balance(WALLET), 15);
  assert.deepEqual(ledger.summary('key:a', WALLET, pricing), {
    priceCents: 10,
    freeScansLeft: 0,
    balanceCents: 15,
  });
  const paid = ledger.charge('key:a', WALLET, pricing);
  assert.equal(typeof paid === 'object' && paid.kind, 'paid');
  assert.equal(ledger.balance(WALLET), 5);
  assert.equal(ledger.charge('key:a', WALLET, pricing), 'no_credit');
  assert.equal(ledger.charge('key:a', null, pricing), 'no_credit');
  // Free scans are counted per install, so another install gets its own.
  assert.equal(ledger.freeScansLeft('key:b', pricing), 2);
});

test('free scans reset each month', () => {
  const ledger = new Ledger(':memory:');
  const october = new Date('2026-10-31T23:00:00Z');
  ledger.charge('key:a', null, pricing, october);
  ledger.charge('key:a', null, pricing, october);
  assert.equal(ledger.charge('key:a', null, pricing, october), 'no_credit');
  assert.equal(ledger.freeScansLeft('key:a', pricing, new Date('2026-11-01T00:00:00Z')), 2);
});

test('a failed scan gives its charge back', () => {
  const ledger = new Ledger(':memory:');
  ledger.add(WALLET, 100, 'grant', 'test');
  const free = ledger.charge('key:a', WALLET, pricing);
  assert.notEqual(free, 'no_credit');
  if (free !== 'no_credit') ledger.release(free);
  assert.equal(ledger.freeScansLeft('key:a', pricing), 2);

  const zero = { ...pricing, freePerMonth: 0 };
  const paid = ledger.charge('key:a', WALLET, zero);
  assert.equal(ledger.balance(WALLET), 90);
  if (paid !== 'no_credit') {
    ledger.release(paid);
    ledger.release(paid);
  }
  assert.equal(ledger.balance(WALLET), 100);
});

test('an entry is only added once per ref', () => {
  const ledger = new Ledger(':memory:');
  assert.equal(ledger.add(WALLET, 199, 'purchase', 'apple:1'), true);
  assert.equal(ledger.add(WALLET, 199, 'purchase', 'apple:1'), false);
  assert.equal(ledger.add(OTHER, 199, 'purchase', 'apple:1'), false);
  assert.equal(ledger.balance(WALLET), 199);
  assert.equal(ledger.balance(OTHER), 0);
});

// Routes

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

/** Stands in for Apple: a "signed" transaction is just its JSON. */
const fakeApple: AppleStore = {
  async transaction(signed) {
    if (!signed.startsWith('{')) throw new PurchaseError('signature: bad');
    return JSON.parse(signed);
  },
  async notification(signedPayload) {
    if (!signedPayload.startsWith('{')) throw new PurchaseError('signature: bad');
    return JSON.parse(signedPayload);
  },
};

const transaction = (extra: object = {}) =>
  JSON.stringify({
    transactionId: '2000000123',
    productId: PACK,
    type: 'Consumable',
    appAccountToken: WALLET.toUpperCase(),
    quantity: 1,
    environment: 'Sandbox',
    ...extra,
  });

function setup(overrides: Partial<Deps> = {}) {
  const ledger = new Ledger(':memory:');
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    read: async () => ({ recipe, usage: { inputTokens: 1, outputTokens: 1 } }),
    counter: new ScanCounter(':memory:'),
    limits: { perInstall: 100, total: 1000 },
    enabled: () => true,
    credit: { pricing, ledger, apple: fakeApple },
    log: (entry) => logs.push(entry),
    ...overrides,
  });
  const post = (path: string, json: unknown) =>
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(json),
    });
  return { app, ledger, logs, post };
}

const scan = (extra: object = {}) => ({
  installId: 'install-0123456789abcdef',
  pages: [{ data: 'aGVsbG8=', mediaType: 'image/jpeg' }],
  text: 'Toast',
  ...extra,
});

test('scans use free scans, then credit, then answer 402', async () => {
  const { ledger, post } = setup();
  ledger.add(WALLET, 10, 'grant', 'test');
  for (const freeScansLeft of [1, 0]) {
    const res = await post('/v1/scan', scan({ wallet: WALLET }));
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).credit, {
      priceCents: 10,
      freeScansLeft,
      balanceCents: 10,
    });
  }
  const paid = await post('/v1/scan', scan({ wallet: WALLET }));
  assert.deepEqual((await paid.json()).credit.balanceCents, 0);
  const broke = await post('/v1/scan', scan({ wallet: WALLET }));
  assert.equal(broke.status, 402);
  assert.equal((await broke.json()).error, 'no_credit');
});

test('a scan that fails costs nothing', async () => {
  const { ledger, post } = setup({
    read: async () => {
      throw new UnreadableError('refused');
    },
  });
  ledger.add(WALLET, 10, 'grant', 'test');
  for (let i = 0; i < 4; i++) assert.equal((await post('/v1/scan', scan())).status, 502);
  assert.equal(ledger.freeScansLeft('install-0123456789abcdef', pricing), 2);
});

test('with no price set, scans are free and answers are unchanged', async () => {
  const { post } = setup({
    credit: {
      pricing: { priceCents: 0, freePerMonth: 0 },
      ledger: new Ledger(':memory:'),
      apple: null,
    },
  });
  for (let i = 0; i < 3; i++) {
    const res = await post('/v1/scan', scan());
    assert.deepEqual(await res.json(), { recipe });
  }
  const credit = await post('/v1/credit', { installId: 'install-0123456789abcdef' });
  assert.deepEqual(await credit.json(), { priceCents: 0, freeScansLeft: 0, balanceCents: 0 });
});

test('the credit route reports price, free scans and balance', async () => {
  const { ledger, post } = setup();
  ledger.add(WALLET, 250, 'grant', 'test');
  const res = await post('/v1/credit', { installId: 'install-0123456789abcdef', wallet: WALLET });
  assert.deepEqual(await res.json(), { priceCents: 10, freeScansLeft: 2, balanceCents: 250 });
  assert.equal((await post('/v1/credit', { installId: 'x' })).status, 400);
  assert.equal(
    (await post('/v1/credit', { installId: 'install-0123456789abcdef', wallet: 'nope' })).status,
    400,
  );
});

test('a purchase adds its pack to the wallet it was bought for, once', async () => {
  const { ledger, post, logs } = setup();
  for (let i = 0; i < 2; i++) {
    const res = await post('/v1/credit/apple', { transaction: transaction() });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { balanceCents: 199 });
  }
  assert.equal(ledger.balance(WALLET), 199);
  assert.deepEqual(
    logs.map((l) => l.outcome),
    ['credited', 'repeat'],
  );
  await post('/v1/credit/apple', { transaction: transaction({ transactionId: '2', quantity: 2 }) });
  assert.equal(ledger.balance(WALLET), 199 * 3);
});

test('purchases that aren’t credit packs are refused', async () => {
  const { ledger, post } = setup();
  const refused = [
    'not signed',
    transaction({ productId: 'com.bitcli.mealz.other' }),
    transaction({ type: 'Non-Consumable' }),
    transaction({ appAccountToken: undefined }),
    transaction({ revocationDate: 1 }),
  ];
  for (const t of refused)
    assert.equal((await post('/v1/credit/apple', { transaction: t })).status, 400);
  assert.equal(ledger.balance(WALLET), 0);
  const off = setup({ credit: { pricing, ledger, apple: null } });
  assert.equal((await off.post('/v1/credit/apple', { transaction: transaction() })).status, 503);
});

test('a refund notification takes the pack back, once', async () => {
  const { ledger, post } = setup();
  await post('/v1/credit/apple', { transaction: transaction() });
  const refund = JSON.stringify({
    notificationType: 'REFUND',
    data: { signedTransactionInfo: transaction({ revocationDate: 1 }) },
  });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await post('/v1/store/apple/notifications', { signedPayload: refund })).status,
      200,
    );
  assert.equal(ledger.balance(WALLET), 0);

  const other = JSON.stringify({ notificationType: 'CONSUMPTION_REQUEST', data: {} });
  assert.equal((await post('/v1/store/apple/notifications', { signedPayload: other })).status, 200);
  assert.equal(
    (await post('/v1/store/apple/notifications', { signedPayload: 'forged' })).status,
    400,
  );
});
