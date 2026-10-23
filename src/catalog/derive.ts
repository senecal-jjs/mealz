import type {
  Allergen,
  Diet,
  Ingredient,
  IngredientKind,
  Recipe,
  RecipeSource,
} from '@/catalog/types';
import { DIETS } from '@/catalog/types';

const DIETS_BROKEN_BY_KIND: Record<IngredientKind, Diet[]> = {
  plant: [],
  meat: ['vegetarian', 'vegan', 'pescatarian'],
  poultry: ['vegetarian', 'vegan', 'pescatarian'],
  fish: ['vegetarian', 'vegan'],
  shellfish: ['vegetarian', 'vegan'],
  dairy: ['vegan'],
  egg: ['vegan'],
  honey: ['vegan'],
};

const ALLERGENS_IMPLIED_BY_KIND: Partial<Record<IngredientKind, Allergen>> = {
  dairy: 'dairy',
  egg: 'egg',
  fish: 'fish',
  shellfish: 'shellfish',
};

export function dietsBrokenBy(ingredient: Ingredient): Diet[] {
  const broken = [...DIETS_BROKEN_BY_KIND[ingredient.kind]];
  if (ingredient.highCarb) broken.push('low-carb');
  return broken;
}

export function allergensOf(ingredient: Ingredient): Allergen[] {
  const implied = ALLERGENS_IMPLIED_BY_KIND[ingredient.kind];
  const all = new Set<Allergen>(ingredient.allergens ?? []);
  if (implied) all.add(implied);
  return [...all];
}

/**
 * Adds the facts the app derives from ingredients. Optional ingredients don't
 * count against a diet or add allergens, since the cook can leave them out.
 */
export function deriveRecipe(
  source: RecipeSource,
  ingredients: Map<string, Ingredient>,
  mine = false,
): Recipe {
  const broken = new Set<Diet>();
  const allergens = new Set<Allergen>();

  for (const item of source.ingredients) {
    if (item.optional) continue;
    const ingredient = ingredients.get(item.ingredient);
    if (!ingredient) throw new Error(`${source.id}: unknown ingredient "${item.ingredient}"`);
    dietsBrokenBy(ingredient).forEach((d) => broken.add(d));
    allergensOf(ingredient).forEach((a) => allergens.add(a));
  }

  return {
    ...source,
    totalMinutes: source.prepMinutes + source.cookMinutes,
    diets: DIETS.filter((d) => !broken.has(d)),
    allergens: [...allergens].sort(),
    mine,
  };
}
