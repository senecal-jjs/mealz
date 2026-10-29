/**
 * Recipe share links. The whole recipe travels in the link's fragment
 * (`https://<host>/r#<data>`), so no server stores or even sees it: browsers
 * never send the fragment. The data is the recipe as JSON, deflated and
 * base64url-encoded. It carries the definitions of the ingredients it uses,
 * so the web page can show it and the recipient's app can import it even when
 * the sender's catalog is newer.
 *
 * A link can come from anyone, so `decodeShareData` checks everything.
 */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';

import {
  AISLES,
  ALLERGENS,
  INGREDIENT_KINDS,
  UNITS,
  type Ingredient,
  type RecipeIngredient,
  type RecipeSource,
  type Step,
} from '@/catalog/types';

/** Must match `ios.associatedDomains` in app.json and the server that hosts the page. */
export const SHARE_ORIGIN = 'https://mealz-scan.fly.dev';
export const SHARE_PATH = '/r';

const VERSION = 1;
/** Longer links risk being cut off by SMS and some chat apps. */
export const MAX_DATA_LENGTH = 8_000;
const MAX_JSON_BYTES = 100_000;

/** A recipe as shared: no id, photo or review flag. */
export type SharedRecipe = Omit<RecipeSource, 'id' | 'image' | 'reviewed'>;

export type SharePayload = {
  v: typeof VERSION;
  /** The bundled recipe's id, so a recipient who has it opens it instead of importing a copy. */
  c?: string;
  r: SharedRecipe;
  /** Every ingredient the recipe uses. */
  i: Ingredient[];
};

export function sharePayload(
  recipe: RecipeSource & { mine?: boolean },
  getIngredient: (id: string) => Ingredient,
): SharePayload {
  // Derived fields (`totalMinutes`, `diets`…) are dropped: only authored ones travel.
  const r: SharedRecipe = {
    title: recipe.title,
    description: recipe.description,
    baseServings: recipe.baseServings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
  const ids = [...new Set(recipe.ingredients.map((i) => i.ingredient))];
  return { v: VERSION, ...(recipe.mine ? {} : { c: recipe.id }), r, i: ids.map(getIngredient) };
}

export function encodeShareData(payload: SharePayload): string {
  return toBase64Url(deflateSync(strToU8(JSON.stringify(payload)), { level: 9 }));
}

export function shareUrl(payload: SharePayload): string {
  return `${SHARE_ORIGIN}${SHARE_PATH}#${encodeShareData(payload)}`;
}

/** The text that goes in the message. */
export function shareMessage(payload: SharePayload): string {
  return `${payload.r.title}, from Mealz:\n${shareUrl(payload)}`;
}

/** The checked payload, or null for a damaged, foreign or newer link. */
export function decodeShareData(data: string): SharePayload | null {
  if (!data || data.length > MAX_DATA_LENGTH || !/^[A-Za-z0-9_-]+$/.test(data)) return null;
  try {
    const bytes = inflateSync(fromBase64Url(data));
    if (bytes.length > MAX_JSON_BYTES) return null;
    return checkPayload(JSON.parse(strFromU8(bytes)));
  } catch {
    return null;
  }
}

/** The share data in an incoming URL: after `#`, or in `?d=` as a fallback. */
export function shareDataFromUrl(url: string): string | null {
  const hash = url.indexOf('#');
  if (hash >= 0) return url.slice(hash + 1) || null;
  const match = /[?&]d=([A-Za-z0-9_-]+)/.exec(url);
  return match ? match[1] : null;
}

// ---- Checking ----

class Invalid extends Error {}

function check(condition: unknown): asserts condition {
  if (!condition) throw new Invalid();
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number, min = 0): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max;
const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const optional = (v: unknown, test: (v: unknown) => boolean) => v === undefined || test(v);
const isBool = (v: unknown) => typeof v === 'boolean';
const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T);

function checkPayload(value: unknown): SharePayload | null {
  try {
    check(isObject(value) && value.v === VERSION);
    check(optional(value.c, (c) => isText(c, 100, 1)));
    check(Array.isArray(value.i) && value.i.length <= 100);
    const ingredients = value.i.map(checkIngredient);
    const known = new Set(ingredients.map((i) => i.id));
    check(known.size === ingredients.length);
    const recipe = checkRecipe(value.r, known);
    return { v: VERSION, ...(value.c ? { c: value.c as string } : {}), r: recipe, i: ingredients };
  } catch (e) {
    if (e instanceof Invalid) return null;
    throw e;
  }
}

function checkIngredient(value: unknown): Ingredient {
  check(isObject(value));
  const { id, name, plural, aisle, kind, highCarb, allergens, staple } = value;
  check(isText(id, 100, 1) && isText(name, 80, 1));
  check(optional(plural, (p) => isText(p, 80, 1)));
  check(oneOf(AISLES)(aisle) && oneOf(INGREDIENT_KINDS)(kind));
  check(optional(highCarb, isBool) && optional(staple, isBool));
  check(optional(allergens, (a) => Array.isArray(a) && a.length <= 9 && a.every(oneOf(ALLERGENS))));
  return {
    id,
    name,
    aisle,
    kind,
    ...(plural !== undefined && { plural: plural as string }),
    ...(highCarb !== undefined && { highCarb: highCarb as boolean }),
    ...(allergens !== undefined && { allergens: allergens as Ingredient['allergens'] }),
    ...(staple !== undefined && { staple: staple as boolean }),
  };
}

function checkRecipe(value: unknown, known: Set<string>): SharedRecipe {
  check(isObject(value));
  const { title, description, baseServings, prepMinutes, cookMinutes, difficulty, tags } = value;
  check(isText(title, 200, 1) && isText(description, 2_000));
  check(isInt(baseServings, 1, 50));
  check(isInt(prepMinutes, 0, 1_440) && isInt(cookMinutes, 0, 1_440));
  check(difficulty === 'easy' || difficulty === 'medium');
  check(Array.isArray(tags) && tags.length <= 20 && tags.every((t) => isText(t, 40, 1)));

  check(Array.isArray(value.ingredients) && value.ingredients.length >= 1);
  check(value.ingredients.length <= 100);
  const ingredients = value.ingredients.map((item) => checkRecipeIngredient(item, known));
  const localIds = new Set(ingredients.map((i) => i.id));
  check(localIds.size === ingredients.length);

  check(Array.isArray(value.steps) && value.steps.length >= 1 && value.steps.length <= 100);
  const steps = value.steps.map((step) => checkStep(step, localIds));

  return {
    title,
    description,
    baseServings,
    prepMinutes,
    cookMinutes,
    difficulty,
    tags: tags as string[],
    ingredients,
    steps,
  };
}

function checkRecipeIngredient(value: unknown, known: Set<string>): RecipeIngredient {
  check(isObject(value));
  const { id, ingredient, quantity, unit, prep, optional: isOptional } = value;
  check(isText(id, 40, 1) && typeof ingredient === 'string' && known.has(ingredient));
  if (quantity === null) {
    check(unit === null);
  } else {
    check(typeof quantity === 'number' && Number.isFinite(quantity));
    check(quantity > 0 && quantity <= 10_000);
    check(unit === null || oneOf(UNITS)(unit));
  }
  check(optional(prep, (p) => isText(p, 200)) && optional(isOptional, isBool));
  return {
    id,
    ingredient,
    quantity: quantity as number | null,
    unit: unit as RecipeIngredient['unit'],
    ...(prep !== undefined && { prep: prep as string }),
    ...(isOptional !== undefined && { optional: isOptional as boolean }),
  };
}

function checkStep(value: unknown, localIds: Set<string>): Step {
  check(isObject(value));
  const { text, uses, timerMinutes } = value;
  check(isText(text, 2_000, 1));
  check(Array.isArray(uses) && uses.length <= 100);
  check(uses.every((u) => typeof u === 'string' && localIds.has(u)));
  check(optional(timerMinutes, (t) => isInt(t, 1, 1_440)));
  return {
    text,
    uses: uses as string[],
    ...(timerMinutes !== undefined && { timerMinutes: timerMinutes as number }),
  };
}

// ---- base64url ----

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = new Map([...ALPHABET].map((c, i) => [c, i]));

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < chars; j++) out += ALPHABET[(n >> (18 - 6 * j)) & 63];
  }
  return out;
}

function fromBase64Url(text: string): Uint8Array {
  check(text.length % 4 !== 1);
  const bytes = new Uint8Array(Math.floor((text.length * 6) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const c of text) {
    const n = LOOKUP.get(c);
    check(n !== undefined);
    value = (value << 6) | n;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (value >> bits) & 255;
    }
  }
  return bytes;
}
