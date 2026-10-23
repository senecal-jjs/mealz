/**
 * Builds the grocery list from the plan: scales every planned recipe, merges
 * the same ingredient across recipes, and rounds up to amounts you can buy.
 * Pure logic, no React or database (PLAN.md §5).
 */
import type { Aisle, Ingredient, Recipe, Unit } from '@/catalog/types';
import { AISLES } from '@/catalog/types';
import { formatFraction, pluralName, scaleFactor, singularName } from '@/domain/quantity';

export type UnitSystem = 'us' | 'metric';

export type PlannedRecipe = { recipe: Recipe; servings: number };

export type GroceryLine = {
  /** The ingredient id; stable across rebuilds so checked state can follow it. */
  key: string;
  /** "3", "1 ½ cups", "2 lb + 1"; empty for to-taste items. */
  amount: string;
  /** Pluralized when counted ("3 limes"). */
  name: string;
  aisle: Aisle;
  staple: boolean;
  /** Every use of this ingredient is marked optional. */
  optional: boolean;
  recipeTitles: string[];
};

const GRAMS: Partial<Record<Unit, number>> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const MILLILITRES: Partial<Record<Unit, number>> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
};
/** Units that are counted and can't be converted to each other. */
const COUNT_UNITS: Unit[] = ['whole', 'clove', 'can', 'bunch', 'slice'];
const COUNT_LABELS: Partial<Record<Unit, [string, string]>> = {
  clove: ['clove', 'cloves'],
  can: ['can', 'cans'],
  bunch: ['bunch', 'bunches'],
  slice: ['slice', 'slices'],
};

type Totals = {
  ingredient: Ingredient;
  grams: number;
  millilitres: number;
  counts: Map<Unit, number>;
  toTaste: boolean;
  allOptional: boolean;
  recipeTitles: Set<string>;
};

/**
 * Rounds up to the next multiple of `step`. The tolerance absorbs conversion
 * noise (½ tbsp is 1.500002 tsp with these factors) so it doesn't round up a step.
 */
function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step - 0.001) * step;
}

function formatMass(grams: number, system: UnitSystem): string {
  if (system === 'metric') {
    if (grams >= 1000)
      return `${ceilTo(grams / 1000, 0.1)
        .toFixed(1)
        .replace(/\.0$/, '')} kg`;
    return `${ceilTo(grams, grams >= 100 ? 10 : 5)} g`;
  }
  const ounces = grams / GRAMS.oz!;
  if (ounces < 16) return `${ceilTo(ounces, 1)} oz`;
  return `${formatFraction(ceilTo(ounces / 16, 0.25))} lb`;
}

function formatVolume(ml: number, system: UnitSystem): string {
  if (system === 'metric') {
    if (ml >= 1000)
      return `${ceilTo(ml / 1000, 0.1)
        .toFixed(1)
        .replace(/\.0$/, '')} l`;
    return `${ceilTo(ml, ml >= 100 ? 10 : 5)} ml`;
  }
  const cups = ml / MILLILITRES.cup!;
  if (cups >= 0.25) {
    const rounded = ceilTo(cups, 0.25);
    return `${formatFraction(rounded)} ${rounded > 1 ? 'cups' : 'cup'}`;
  }
  const tbsp = ml / MILLILITRES.tbsp!;
  if (tbsp >= 1) return `${formatFraction(ceilTo(tbsp, 0.5))} tbsp`;
  return `${formatFraction(ceilTo(ml / MILLILITRES.tsp!, 0.25))} tsp`;
}

function formatLine(totals: Totals, system: UnitSystem): { amount: string; name: string } {
  const parts: string[] = [];
  let name = totals.ingredient.name;

  if (totals.grams > 0) parts.push(formatMass(totals.grams, system));
  if (totals.millilitres > 0) parts.push(formatVolume(totals.millilitres, system));
  for (const unit of COUNT_UNITS) {
    const count = totals.counts.get(unit);
    if (!count) continue;
    // You can't buy a third of an onion.
    const whole = ceilTo(count, 1);
    if (unit === 'whole') {
      parts.push(`${whole}`);
      if (parts.length === 1) {
        name = whole > 1 ? pluralName(totals.ingredient) : singularName(totals.ingredient);
      }
    } else {
      const [one, many] = COUNT_LABELS[unit]!;
      parts.push(`${whole} ${whole > 1 ? many : one}`);
    }
  }

  return { amount: parts.join(' + '), name };
}

export function compileGroceryList(
  planned: PlannedRecipe[],
  ingredients: Map<string, Ingredient>,
  system: UnitSystem = 'us',
): GroceryLine[] {
  const byIngredient = new Map<string, Totals>();

  for (const { recipe, servings } of planned) {
    const factor = scaleFactor(recipe.baseServings, servings);
    for (const item of recipe.ingredients) {
      const ingredient = ingredients.get(item.ingredient);
      if (!ingredient) continue;

      let totals = byIngredient.get(ingredient.id);
      if (!totals) {
        totals = {
          ingredient,
          grams: 0,
          millilitres: 0,
          counts: new Map(),
          toTaste: false,
          allOptional: true,
          recipeTitles: new Set(),
        };
        byIngredient.set(ingredient.id, totals);
      }
      totals.recipeTitles.add(recipe.title);
      if (!item.optional) totals.allOptional = false;

      if (item.quantity === null || item.unit === null) {
        totals.toTaste = true;
        continue;
      }
      const amount = item.quantity * factor;
      if (GRAMS[item.unit]) totals.grams += amount * GRAMS[item.unit]!;
      else if (MILLILITRES[item.unit]) totals.millilitres += amount * MILLILITRES[item.unit]!;
      else totals.counts.set(item.unit, (totals.counts.get(item.unit) ?? 0) + amount);
    }
  }

  const lines = [...byIngredient.values()].map((totals): GroceryLine => {
    const { amount, name } = formatLine(totals, system);
    return {
      key: totals.ingredient.id,
      amount,
      name,
      aisle: totals.ingredient.aisle,
      staple: totals.ingredient.staple ?? false,
      optional: totals.allOptional,
      recipeTitles: [...totals.recipeTitles].sort(),
    };
  });

  return lines.sort(
    (a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name),
  );
}

/** "3 limes", "salt", "1 ½ cups jasmine rice (optional)". */
export function describeLine(line: Pick<GroceryLine, 'amount' | 'name' | 'optional'>): string {
  const text = line.amount ? `${line.amount} ${line.name}` : line.name;
  return line.optional ? `${text} (optional)` : text;
}
