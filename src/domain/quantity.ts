import type { Ingredient, RecipeIngredient, Unit } from '@/catalog/types';

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

/** Multiplier to turn a recipe's base servings into `servings`. */
export function scaleFactor(baseServings: number, servings: number): number {
  return servings / baseServings;
}

const FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
];

/** 1.5 → "1 ½", 0.333 → "⅓", 2 → "2". Snaps to the nearest kitchen fraction. */
export function formatFraction(value: number): string {
  let whole = Math.floor(value);
  const rest = value - whole;
  let best = FRACTIONS[0];
  for (const candidate of FRACTIONS) {
    if (Math.abs(candidate[0] - rest) < Math.abs(best[0] - rest)) best = candidate;
  }
  if (best[0] === 1) whole += 1;
  if (whole === 0 && best[1] === '') return best[0] === 0 && value > 0 ? '⅛' : '0';
  if (whole === 0) return best[1];
  return best[1] ? `${whole} ${best[1]}` : `${whole}`;
}

/** Metric amounts read better as rounded decimals than as fractions. */
function formatMetric(value: number, unit: Unit): string {
  if (unit === 'g' || unit === 'ml') {
    const step = value >= 100 ? 10 : value >= 20 ? 5 : 1;
    return `${Math.max(step, Math.round(value / step) * step)}`;
  }
  return `${Math.round(value * 100) / 100}`;
}

const UNIT_LABELS: Record<Unit, [singular: string, plural: string]> = {
  g: ['g', 'g'],
  kg: ['kg', 'kg'],
  oz: ['oz', 'oz'],
  lb: ['lb', 'lb'],
  ml: ['ml', 'ml'],
  l: ['l', 'l'],
  tsp: ['tsp', 'tsp'],
  tbsp: ['tbsp', 'tbsp'],
  cup: ['cup', 'cups'],
  whole: ['', ''],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans'],
  bunch: ['bunch', 'bunches'],
  slice: ['slice', 'slices'],
};

/**
 * The name for a count of one. Names stored in the plural ("carrots") lose the
 * "s"; names with an explicit plural, or ending in "ss"/"us", are left alone.
 */
export function singularName(ingredient: Ingredient): string {
  const { name } = ingredient;
  if (ingredient.plural || !name.endsWith('s') || /(ss|us)$/.test(name)) return name;
  if (name.endsWith('oes')) return name.slice(0, -2);
  return name.slice(0, -1);
}

export function pluralName(ingredient: Ingredient): string {
  if (ingredient.plural) return ingredient.plural;
  return ingredient.name.endsWith('s') ? ingredient.name : `${ingredient.name}s`;
}

export type FormattedAmount = {
  /** "1 ½ cups", "3 cloves", "2" — empty for "to taste". */
  amount: string;
  /** Ingredient name, pluralized when counted ("2 limes"). */
  name: string;
};

/** Formats one recipe ingredient line, scaled by `factor`. */
export function formatIngredient(
  item: Pick<RecipeIngredient, 'quantity' | 'unit'>,
  ingredient: Ingredient,
  factor = 1,
): FormattedAmount {
  if (item.quantity === null || item.unit === null) {
    return { amount: '', name: ingredient.name };
  }
  const value = item.quantity * factor;
  const metric = ['g', 'kg', 'ml', 'l'].includes(item.unit);
  const number = metric ? formatMetric(value, item.unit) : formatFraction(value);
  const many = value > 1 && number !== '1';

  if (item.unit === 'whole') {
    return { amount: number, name: many ? pluralName(ingredient) : singularName(ingredient) };
  }
  const label = UNIT_LABELS[item.unit][many ? 1 : 0];
  return { amount: `${number} ${label}`, name: ingredient.name };
}
