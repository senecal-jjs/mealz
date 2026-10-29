import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';

import { createApp } from '../src/app.ts';
import { ScanCounter } from '../src/limits.ts';

const setup = (share = {}) =>
  createApp({
    read: async () => {
      throw new Error('unused');
    },
    counter: new ScanCounter(':memory:'),
    limits: { perInstall: 1, total: 1 },
    enabled: () => true,
    log: () => {},
    share,
  });

test('serves the app-site association when the app ID is set', async () => {
  const res = await setup({ appId: 'TEAM123.com.bitcli.mealz' }).request(
    '/.well-known/apple-app-site-association',
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await res.json(), {
    applinks: {
      details: [
        { appIDs: ['TEAM123.com.bitcli.mealz'], components: [{ '/': '/r' }, { '/': '/r/' }] },
      ],
    },
  });
  assert.equal((await setup().request('/.well-known/apple-app-site-association')).status, 404);
});

test('serves the share page with a strict content policy', async () => {
  const res = await setup().request('/r');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy') ?? '', /script-src 'self'/);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  const html = await res.text();
  assert.match(html, /<script src="\/r\/share.js">/);
  assert.match(html, /coming soon/);
  assert.equal((await setup().request('/r/share.js')).status, 200);
});

test('links the App Store page once there is one, escaped', async () => {
  const html = await (
    await setup({ appStoreUrl: 'https://apps.apple.com/app/id1?a="b"' }).request('/r')
  ).text();
  assert.match(html, /href="https:\/\/apps.apple.com\/app\/id1\?a=&#34;b&#34;"/);
});

test('the page script reads a recipe the way the app writes it', async () => {
  const script = await (await setup().request('/r/share.js')).text();
  const payload = {
    v: 1,
    r: {
      title: '<img src=x onerror=alert(1)>',
      description: '',
      baseServings: 2,
      prepMinutes: 5,
      cookMinutes: 10,
      difficulty: 'easy',
      tags: [],
      ingredients: [
        { id: 'a', ingredient: 'egg', quantity: 2, unit: 'whole' },
        { id: 'b', ingredient: 'flour', quantity: 1.5, unit: 'cup', prep: 'sifted' },
        { id: 'c', ingredient: 'salt', quantity: null, unit: null },
      ],
      steps: [{ text: 'Mix.', uses: ['a', 'b', 'c'] }],
    },
    i: [
      { id: 'egg', name: 'egg', aisle: 'dairy', kind: 'egg' },
      { id: 'flour', name: 'flour', aisle: 'pantry', kind: 'plant' },
      { id: 'salt', name: 'salt', aisle: 'spices', kind: 'plant' },
    ],
  };
  const data = deflateRawSync(JSON.stringify(payload)).toString('base64url');

  // A tiny DOM: only what the script touches.
  const elements = new Map<
    string,
    {
      hidden: boolean;
      textContent: string;
      children: string[];
      append(e: { textContent: string }): void;
    }
  >();
  const element = () => ({
    hidden: true,
    textContent: '',
    children: [] as string[],
    append(e: { textContent: string }) {
      this.children.push(e.textContent);
    },
  });
  const document = {
    title: '',
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id)!;
    },
    createElement: () => ({ textContent: '' }),
  };
  const run = new Function('document', 'location', `return ${script.trim().replace(/;$/, '')}`);
  await run(document, { hash: `#${data}` });

  assert.equal(elements.get('recipe')?.hidden, false);
  assert.equal(elements.get('title')?.textContent, '<img src=x onerror=alert(1)>');
  assert.equal(elements.get('facts')?.textContent, 'Serves 2 · 15 min');
  assert.deepEqual(elements.get('ingredients')?.children, [
    '2 eggs',
    '1 ½ cups flour, sifted',
    'salt, to taste',
  ]);
  assert.deepEqual(elements.get('steps')?.children, ['Mix.']);

  elements.clear();
  await run(document, { hash: '#garbage' });
  assert.equal(elements.get('error')?.hidden, false);
  assert.equal(elements.get('recipe'), undefined);
});
