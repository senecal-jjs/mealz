/**
 * @jest-environment node
 */
import { deflateSync, strToU8 } from 'fflate';
import { inflateRawSync } from 'node:zlib';

import { buildCatalog, getIngredient, withLookups } from '@/catalog';
import { ingredientSources, recipeSources } from '@/catalog/data';
import type { Ingredient, RecipeSource } from '@/catalog/types';
import { planImport } from '@/features/sharing/import';
import {
  decodeShareData,
  encodeShareData,
  MAX_DATA_LENGTH,
  SHARE_ORIGIN,
  shareDataFromUrl,
  sharePayload,
  shareUrl,
  type SharePayload,
} from '@/features/sharing/share-link';

const bundled = recipeSources[0];
const custom: Ingredient = {
  id: 'my-gochujang-k3j9',
  name: 'Gochujang',
  aisle: 'pantry',
  kind: 'plant',
};

function userRecipe(): RecipeSource & { mine: true } {
  return {
    id: 'my-abc',
    title: 'Grandma’s Stew',
    description: 'Warm & “cozy” <b>not bold</b>',
    image: 'recipe-photos/x.jpg',
    baseServings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    difficulty: 'easy',
    tags: ['dinner'],
    reviewed: true,
    mine: true,
    ingredients: [
      { id: 'a', ingredient: bundled.ingredients[0].ingredient, quantity: 1.5, unit: 'cup' },
      { id: 'b', ingredient: custom.id, quantity: null, unit: null, optional: true },
    ],
    steps: [{ text: 'Cook it all. 🍲', uses: ['a', 'b'], timerMinutes: 20 }],
  };
}

const lookup = (id: string) => (id === custom.id ? custom : getIngredient(id));
const encode = (value: unknown) => {
  const b64 = Buffer.from(deflateSync(strToU8(JSON.stringify(value)))).toString('base64url');
  return b64;
};

describe('share links', () => {
  it('round-trips a user recipe without its id, photo or review flag', () => {
    const payload = sharePayload(userRecipe(), lookup);
    expect(payload.c).toBeUndefined();
    expect(payload.r).not.toHaveProperty('image');
    expect(payload.r).not.toHaveProperty('id');
    expect(payload.i.map((i) => i.id)).toEqual([bundled.ingredients[0].ingredient, custom.id]);
    expect(decodeShareData(encodeShareData(payload))).toEqual(payload);
  });

  it('writes standard base64url and raw deflate, as the web page reads them', () => {
    const payload = sharePayload(userRecipe(), lookup);
    const bytes = Buffer.from(encodeShareData(payload), 'base64url');
    expect(JSON.parse(inflateRawSync(bytes).toString())).toEqual(payload);
  });

  it('marks bundled recipes with their id', () => {
    const payload = sharePayload(bundled, getIngredient);
    expect(payload.c).toBe(bundled.id);
  });

  it('keeps every bundled recipe short enough for a text message', () => {
    for (const recipe of recipeSources) {
      const data = encodeShareData(sharePayload(recipe, getIngredient));
      expect(data.length).toBeLessThan(2_500);
      expect(decodeShareData(data)).not.toBeNull();
    }
  });

  it('builds a link to the share page with the data after #', () => {
    const url = shareUrl(sharePayload(bundled, getIngredient));
    expect(url.startsWith(`${SHARE_ORIGIN}/r#`)).toBe(true);
    expect(shareDataFromUrl(url)).toBe(url.split('#')[1]);
    expect(shareDataFromUrl('https://x.test/r?d=abc_-1')).toBe('abc_-1');
    expect(shareDataFromUrl('https://x.test/r')).toBeNull();
  });

  it('rejects damaged, oversized and newer links', () => {
    const good = sharePayload(userRecipe(), lookup);
    expect(decodeShareData('')).toBeNull();
    expect(decodeShareData('not base64!')).toBeNull();
    expect(decodeShareData(encodeShareData(good).slice(0, 40))).toBeNull();
    expect(decodeShareData('A'.repeat(MAX_DATA_LENGTH + 4))).toBeNull();
    expect(decodeShareData(encode({ ...good, v: 2 }))).toBeNull();
    expect(decodeShareData(encode('hello'))).toBeNull();
  });

  it.each<[string, (p: SharePayload) => unknown]>([
    ['an unknown ingredient', (p) => ({ ...p, i: p.i.slice(1) })],
    [
      'an unknown unit',
      (p) => ({ ...p, r: { ...p.r, ingredients: [{ ...p.r.ingredients[0], unit: 'pinch' }] } }),
    ],
    [
      'a negative quantity',
      (p) => ({ ...p, r: { ...p.r, ingredients: [{ ...p.r.ingredients[0], quantity: -1 }] } }),
    ],
    [
      'a unit without a quantity',
      (p) => ({ ...p, r: { ...p.r, ingredients: [{ ...p.r.ingredients[0], quantity: null }] } }),
    ],
    [
      'a step using a missing ingredient',
      (p) => ({ ...p, r: { ...p.r, steps: [{ text: 'x', uses: ['zzz'] }] } }),
    ],
    ['no steps', (p) => ({ ...p, r: { ...p.r, steps: [] } })],
    ['a huge serving count', (p) => ({ ...p, r: { ...p.r, baseServings: 1e9 } })],
    ['an unknown aisle', (p) => ({ ...p, i: p.i.map((i) => ({ ...i, aisle: 'garage' })) })],
    ['a long title', (p) => ({ ...p, r: { ...p.r, title: 'x'.repeat(201) } })],
  ])('rejects a recipe with %s', (_, change) => {
    expect(decodeShareData(encode(change(sharePayload(userRecipe(), lookup))))).toBeNull();
  });

  it('drops fields it does not know', () => {
    const payload = sharePayload(userRecipe(), lookup);
    const extra = { ...payload, x: 1, r: { ...payload.r, image: 'file:///etc/passwd' } };
    expect(decodeShareData(encode(extra))).toEqual(payload);
  });
});

describe('importing', () => {
  const catalog = buildCatalog(ingredientSources, recipeSources, true);

  it('opens a bundled recipe the recipient has', () => {
    expect(planImport(sharePayload(bundled, getIngredient), catalog)).toEqual({
      kind: 'bundled',
      id: bundled.id,
    });
  });

  it('prepares a new recipe, reusing known ingredients and adding the rest', () => {
    const plan = planImport(sharePayload(userRecipe(), lookup), catalog);
    if (plan.kind !== 'new') throw new Error(plan.kind);
    expect(plan.recipe.id).toMatch(/^my-/);
    expect(plan.recipe.id).not.toBe('my-abc');
    expect(plan.recipe).toMatchObject({ image: null, reviewed: false, title: 'Grandma’s Stew' });
    expect(plan.ingredients).toHaveLength(1);
    expect(plan.ingredients[0]).toMatchObject({ name: 'Gochujang', aisle: 'pantry' });
    expect(plan.ingredients[0].id).not.toBe(custom.id);
    expect(plan.recipe.ingredients.map((i) => i.ingredient)).toEqual([
      bundled.ingredients[0].ingredient,
      plan.ingredients[0].id,
    ]);
    expect(plan.lookup.size).toBe(2);
  });

  it('matches a custom ingredient to one of the same name', () => {
    const mine = { ...custom, id: 'my-gochujang-zzzz', name: 'gochujang ' };
    const withMine = buildCatalog(ingredientSources, recipeSources, true, {
      recipes: [],
      ingredients: [mine],
    });
    const plan = planImport(sharePayload(userRecipe(), lookup), withMine);
    if (plan.kind !== 'new') throw new Error(plan.kind);
    expect(plan.ingredients).toEqual([]);
    expect(plan.recipe.ingredients[1].ingredient).toBe(mine.id);
  });

  it('imports a bundled recipe the recipient lacks as their own', () => {
    const newer = { ...bundled, id: 'from-a-newer-catalog' };
    const plan = planImport(sharePayload(newer, getIngredient), catalog);
    expect(plan.kind).toBe('new');
  });

  it('points at a copy already saved', () => {
    const saved = { ...userRecipe(), id: 'my-saved', ingredients: [userRecipe().ingredients[0]] };
    saved.steps = [{ text: 'Cook it all. 🍲', uses: ['a'] }];
    const withSaved = withLookups(
      buildCatalog(ingredientSources, recipeSources, true, { recipes: [saved], ingredients: [] }),
    );
    expect(planImport(sharePayload(userRecipe(), lookup), withSaved)).toEqual({
      kind: 'saved',
      id: 'my-saved',
    });
  });
});
